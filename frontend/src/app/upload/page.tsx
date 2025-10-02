'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface CSVPreview {
  headers: string[]
  sample_rows: string[][]
  total_rows: number
}

interface ColumnMapping {
  [key: string]: string
}

interface CustomerField {
  key: string
  label: string
  required: boolean
}

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [customerFields, setCustomerFields] = useState<CustomerField[]>([])
  const [loadingFields, setLoadingFields] = useState(true)

  // Fetch customer fields from backend
  useEffect(() => {
    const fetchCustomerFields = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          toast.error('Please log in to access upload page')
          router.push('/login')
          return
        }

        const response = await fetch('/api/upload/customer-fields', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch customer fields')
        }

        const data = await response.json()
        setCustomerFields(data.fields || [])
      } catch (error) {
        console.error('Error fetching customer fields:', error)
        toast.error('Failed to load customer fields')
        // Fallback to default fields
        setCustomerFields([
          { key: 'name', label: 'Name', required: true },
          { key: 'phone', label: 'Phone', required: false },
          { key: 'email', label: 'Email', required: false },
          { key: 'customer_id', label: 'Customer/Order ID', required: false },
          { key: 'service_date', label: 'Service/Purchase Date', required: false },
          { key: 'google_review_link', label: 'Google Review Link', required: false },
          { key: 'ignore', label: 'Ignore Column', required: false }
        ])
      } finally {
        setLoadingFields(false)
      }
    }

    fetchCustomerFields()
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(uploadedFile)
    setIsProcessing(true)
    
    try {
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        toast.error('Please log in to upload files')
        return
      }

      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/upload/csv/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setPreview(result.preview)
      setJobId(result.job_id)
      setStep('mapping')
      toast.success('File uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  })

  const handleColumnMappingChange = (csvColumn: string, guestField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: guestField
    }))
  }

  const handleConfirmMapping = async () => {
    if (!jobId) return

    setIsProcessing(true)
    setStep('processing')
    
    try {
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        toast.error('Please log in to process files')
        setStep('mapping')
        return
      }

      const response = await fetch(`/api/upload/job/${jobId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ column_mapping: columnMapping }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process CSV')
      }

      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            setTimeout(() => {
              toast.success('CSV processed successfully!')
              router.push('/customers')
            }, 1000)
            return 100
          }
          return prev + 10
        })
      }, 200)

    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Failed to process CSV')
      setStep('mapping')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetUpload = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setColumnMapping({})
    setUploadProgress(0)
    setJobId(null)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/customers"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-white bg-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-600 border border-gray-300 hover:border-purple-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Link>
          </div>
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-6 shadow-lg border border-purple-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Customer List</h1>
                <p className="text-purple-600 font-medium">CSV Import & Processing</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Upload a CSV file containing your customer information to get started with automated review campaigns and customer management.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center">
              <div className={`flex items-center ${step === 'upload' ? 'text-purple-600' : step === 'mapping' || step === 'processing' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-all duration-300 ${
                  step === 'upload' ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white transform scale-110 ring-4 ring-purple-200' : 
                  step === 'mapping' || step === 'processing' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white transform scale-110' : 
                  'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
                }`}>
                  {step === 'mapping' || step === 'processing' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">1</span>
                  )}
                </div>
                <span className="ml-3 text-sm font-semibold transition-colors duration-300">Upload File</span>
              </div>
              <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 mx-6">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  step === 'mapping' || step === 'processing' ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-sm w-full' : 'w-0'
                }`} />
              </div>
              <div className={`flex items-center ${step === 'mapping' ? 'text-purple-600' : step === 'processing' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-all duration-300 ${
                  step === 'mapping' ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white transform scale-110 ring-4 ring-purple-200' : 
                  step === 'processing' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white transform scale-110' : 
                  'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
                }`}>
                  {step === 'processing' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">2</span>
                  )}
                </div>
                <span className="ml-3 text-sm font-semibold transition-colors duration-300">Map Columns</span>
              </div>
              <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 mx-6">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  step === 'processing' ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-sm w-full' : 'w-0'
                }`} />
              </div>
              <div className={`flex items-center ${step === 'processing' ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-all duration-300 ${
                  step === 'processing' ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white transform scale-110 ring-4 ring-purple-200' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
                }`}>
                  <span className="text-sm font-bold">3</span>
                </div>
                <span className="ml-3 text-sm font-semibold transition-colors duration-300">Process Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Upload CSV File</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Upload a CSV file with your customer information. Make sure your file includes columns like name, email, phone, etc.
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                isDragActive
                  ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-purple-50 hover:shadow-md'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
              {isDragActive ? (
                <p className="text-xl font-bold text-purple-600">Drop the CSV file here...</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="text-gray-600 mb-4">
                  Supported format: CSV files only
                </p>
                  <button
                    type="button"
                    className="inline-flex items-center px-6 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Choose File
                  </button>
                </>
              )}
            </div>

            {file && (
              <div className="mt-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">Ready</span>
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg animate-pulse">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                </div>
                <p className="text-gray-600 font-medium">Processing your file...</p>
              </div>
            )}

            {/* Sample CSV Format */}
            <div className="mt-6 bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Expected CSV Format:</h3>
              <div className="text-xs font-mono text-gray-600 bg-white p-3 rounded border">
                name,phone,email,customer_id,service_date<br />
                John Doe,+1234567890,john@example.com,ORD001,2024-01-15<br />
                Jane Smith,+0987654321,jane@example.com,ORD002,2024-01-20
              </div>
            </div>
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && preview && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Map CSV Columns</h2>
              <p className="text-gray-600">
                Map your CSV columns to customer data fields. Preview shows the first few rows.
              </p>
              <div className="text-sm text-gray-500 mt-2">
                Found {preview.total_rows} rows in your CSV file
              </div>
            </div>
            
            {/* Column Mapping */}
            <div className="space-y-4 mb-6">
              {preview.headers.map((header, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700">
                      {header}
                    </label>
                  </div>
                  <div className="w-1/3">
                    <select
                      value={columnMapping[header] || ''}
                      onChange={(e) => handleColumnMappingChange(header, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    >
                      <option value="">Select field...</option>
                      {customerFields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label} {field.required && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/3 text-sm text-gray-500">
                    Sample: {preview.sample_rows[0]?.[index] || '-'}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Data Preview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.sample_rows.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={resetUpload}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Start Over
              </button>
              <button
                onClick={handleConfirmMapping}
                disabled={isProcessing || Object.keys(columnMapping).length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Confirm & Import'}
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing Your Data</h2>
                <p className="mt-2 text-gray-600">
                  We're importing your guest data and preparing it for ReviewReap automation.
                </p>
              </div>

              <div className="mb-6">
                <div className="bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{uploadProgress}% complete</p>
              </div>

              {uploadProgress === 100 && (
                <div className="text-green-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Import completed successfully!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}