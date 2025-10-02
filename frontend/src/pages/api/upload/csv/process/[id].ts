import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ColumnMapping {
  [csvColumn: string]: string;
}

interface CustomerData {
  name?: string;
  phone?: string;
  email?: string;
  customer_id?: string;
  service_date?: string;
  google_review_link?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid upload job ID' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return res.status(400).json({ error: 'User not associated with an organization' });
    }

    // Get upload job
    const { data: uploadJob, error: jobError } = await supabase
      .from('upload_jobs')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (jobError || !uploadJob) {
      return res.status(404).json({ error: 'Upload job not found' });
    }

    if (uploadJob.status !== 'pending') {
      return res.status(400).json({ error: 'Upload job already processed' });
    }

    // Parse form data to get column mapping
    const form = formidable();
    const [fields] = await form.parse(req);
    
    const columnMappingStr = Array.isArray(fields.column_mapping) 
      ? fields.column_mapping[0] 
      : fields.column_mapping;
    
    if (!columnMappingStr) {
      return res.status(400).json({ error: 'Column mapping is required' });
    }

    const columnMapping: ColumnMapping = JSON.parse(columnMappingStr);

    // Update job status to processing
    await supabase
      .from('upload_jobs')
      .update({ 
        status: 'processing',
        column_mapping: columnMapping
      })
      .eq('id', id);

    // Process CSV file
    const customers: CustomerData[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    let totalRows = 0;
    let processedRows = 0;
    let isFirstRow = true;
    let headers: string[] = [];

    return new Promise((resolve) => {
      fs.createReadStream(uploadJob.file_path)
        .pipe(csv({ headers: false }))
        .on('data', (row: any) => {
          const rowArray = Object.values(row) as string[];
          totalRows++;
          
          if (isFirstRow) {
            headers = rowArray;
            isFirstRow = false;
            return;
          }

          try {
            const customerData: CustomerData = {};
            let hasRequiredData = false;

            // Map CSV columns to customer fields
            headers.forEach((header, index) => {
              const mappedField = columnMapping[header];
              if (mappedField && mappedField !== 'ignore' && rowArray[index]) {
                const value = rowArray[index].trim();
                if (value) {
                  (customerData as any)[mappedField] = value;
                  if (mappedField === 'name') {
                    hasRequiredData = true;
                  }
                }
              }
            });

            // Validate required fields
            if (!hasRequiredData || !customerData.name) {
              errors.push({
                row: totalRows,
                error: 'Name is required'
              });
              return;
            }

            // Validate email format if provided
            if (customerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
              errors.push({
                row: totalRows,
                error: 'Invalid email format'
              });
              return;
            }

            // Validate date format if provided
            if (customerData.service_date) {
              const serviceDate = new Date(customerData.service_date);
              if (isNaN(serviceDate.getTime())) {
                errors.push({
                  row: totalRows,
                  error: 'Invalid service date format'
                });
                return;
              }
              customerData.service_date = serviceDate.toISOString().split('T')[0];
            }

            customers.push(customerData);
            processedRows++;

          } catch (error) {
            errors.push({
              row: totalRows,
              error: `Processing error: ${error}`
            });
          }
        })
        .on('end', async () => {
          try {
            // Insert customers in batches
            const batchSize = 100;
            let insertedCount = 0;

            for (let i = 0; i < customers.length; i += batchSize) {
              const batch = customers.slice(i, i + batchSize);
              const customersToInsert = batch.map(customer => ({
                ...customer,
                org_id: profile.org_id
              }));

              const { error: insertError } = await supabase
                .from('customers')
                .insert(customersToInsert);

              if (insertError) {
                console.error('Error inserting customers batch:', insertError);
                errors.push({
                  row: i + 1,
                  error: `Database error: ${insertError.message}`
                });
              } else {
                insertedCount += batch.length;
              }
            }

            // Update upload job with final status
            const finalStatus = errors.length > 0 && insertedCount === 0 ? 'failed' : 'completed';
            
            const { data: updatedJob } = await supabase
              .from('upload_jobs')
              .update({
                status: finalStatus,
                total_rows: totalRows - 1, // Exclude header row
                processed_rows: insertedCount,
                errors: errors.length > 0 ? errors : null
              })
              .eq('id', id)
              .select()
              .single();

            // Clean up uploaded file
            fs.unlink(uploadJob.file_path, (err) => {
              if (err) console.error('Error deleting uploaded file:', err);
            });

            res.status(200).json(updatedJob);
            resolve(updatedJob);

          } catch (error) {
            console.error('Error processing CSV:', error);
            
            // Update job status to failed
            await supabase
              .from('upload_jobs')
              .update({
                status: 'failed',
                errors: [{ row: 0, error: `Processing failed: ${error}` }]
              })
              .eq('id', id);

            res.status(500).json({ error: 'Failed to process CSV' });
            resolve(null);
          }
        })
        .on('error', async (error) => {
          console.error('CSV parsing error:', error);
          
          // Update job status to failed
          await supabase
            .from('upload_jobs')
            .update({
              status: 'failed',
              errors: [{ row: 0, error: `CSV parsing failed: ${error}` }]
            })
            .eq('id', id);

          res.status(500).json({ error: 'Failed to parse CSV file' });
          resolve(null);
        });
    });

  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}