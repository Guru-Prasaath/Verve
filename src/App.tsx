import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import Copilot from '@/pages/Copilot'
import Campaigns from '@/pages/Campaigns'
import CampaignDetail from '@/pages/CampaignDetail'
import Customers from '@/pages/Customers'
import Audiences from '@/pages/Audiences'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Copilot />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="audiences" element={<Audiences />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
