import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Return customer fields for column mapping
    const fields = [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'email', label: 'Email', required: false },
      { key: 'customer_id', label: 'Customer/Order ID', required: false },
      { key: 'service_date', label: 'Service/Purchase Date', required: false },
      { key: 'google_review_link', label: 'Google Review Link', required: false },
      { key: 'ignore', label: 'Ignore Column', required: false }
    ]

    return res.status(200).json({ fields })
  } catch (error) {
    console.error('Error in customer-fields API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}