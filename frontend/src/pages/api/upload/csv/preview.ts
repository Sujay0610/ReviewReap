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

interface CSVPreview {
  headers: string[];
  sample_rows: string[][];
  total_rows: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Parse form data
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read and parse CSV
    const preview: CSVPreview = {
      headers: [],
      sample_rows: [],
      total_rows: 0
    };

    let isFirstRow = true;
    let rowCount = 0;
    const sampleRows: string[][] = [];

    return new Promise((resolve) => {
      fs.createReadStream(file.filepath)
        .pipe(csv({ headers: false }))
        .on('data', (row: any) => {
          const rowArray = Object.values(row) as string[];
          
          if (isFirstRow) {
            preview.headers = rowArray;
            isFirstRow = false;
          } else {
            if (sampleRows.length < 5) {
              sampleRows.push(rowArray);
            }
            rowCount++;
          }
        })
        .on('end', () => {
          preview.sample_rows = sampleRows;
          preview.total_rows = rowCount;
          
          // Clean up temp file
          fs.unlink(file.filepath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
          
          res.status(200).json(preview);
          resolve(preview);
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          
          // Clean up temp file
          fs.unlink(file.filepath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
          
          res.status(500).json({ error: 'Failed to parse CSV file' });
          resolve(null);
        });
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}