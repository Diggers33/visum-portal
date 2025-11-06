import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function TestSupabase() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    // Test connection by fetching products
    supabase
      .from('products')
      .select('count')
      .then(({ error }) => {
        setConnected(!error)
      })
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2">Supabase Connection Test</h3>
      {connected === null && <p>Testing connection...</p>}
      {connected === true && <p className="text-green-600">✅ Connected!</p>}
      {connected === false && <p className="text-red-600">❌ Connection failed</p>}
    </div>
  )
}