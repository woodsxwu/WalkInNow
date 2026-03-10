const KEY = 'c193fd4eb7624bba8c4af5b5cf0ae7eb'
const BASE = 'https://api-ca.medeohealth.com'

async function tryEndpoints(orgId: number) {
  console.log(`=== Org ${orgId} ===`)
  const endpoints = [
    `v3/org/${orgId}/booking-settings`,
    `v3/org/${orgId}/settings`,
    `v3/org/${orgId}/config`,
    `v3/org/${orgId}/providers`,
    `v3/org/${orgId}`,
    `v3/organizations/${orgId}`,
    `v3/organizations/${orgId}/providers`,
    `v3/booking/org/${orgId}`,
    `v3/booking/org/${orgId}/config`,
    `v3/booking/org/${orgId}/providers`,
    `v3/timeslots/org/${orgId}/providers`,
  ]

  for (const ep of endpoints) {
    const res = await fetch(`${BASE}/${ep}`, {
      headers: { 'Ocp-Apim-Subscription-Key': KEY },
    })
    if (res.status !== 404) {
      const text = await res.text()
      console.log(`  ${ep}: ${res.status} → ${text.substring(0, 300)}`)
    }
  }
}

async function main() {
  // Denman (requires provider) and Loyal (works without)
  await tryEndpoints(6555)
  await tryEndpoints(1558)
}

main()
