/**
 * Debug undiscovered Cortico clinics - check if their booking pages
 * redirect or use different patterns
 */

const UNDISCOVERED = [
  'fivepoints', 'ihealthmd', 'granvillemedical', 'commercialdrivemedical',
  'connectmd', 'frasercare', 'wellhealthgrandview', 'vycare',
  'maywoodmedical', 'elicarelougheed', 'imeburnaby', 'tlc',
  'focusmed', 'vivacare', 'gardencitymed', 'thrivemedical',
  'elicarerichmond', 'wellhealth', 'megafuclinic', 'pacificheights',
  'royalcolumbia', 'rockypoint', 'drsheikprimacy',
]

async function checkClinic(subdomain: string) {
  // Check if the booking page redirects to a different system
  try {
    const bookRes = await fetch(`https://${subdomain}.cortico.ca/book/`, {
      headers: { 'User-Agent': 'WalkInNow/1.0' },
      redirect: 'manual',
    })

    if (bookRes.status >= 300 && bookRes.status < 400) {
      const location = bookRes.headers.get('location')
      console.log(`[${subdomain}] REDIRECT → ${location}`)
      return
    }

    if (!bookRes.ok) {
      console.log(`[${subdomain}] Booking page: ${bookRes.status}`)
      return
    }

    const html = await bookRes.text()

    // Check if it contains Cortico booking elements
    const hasCortico = html.includes('cortico') || html.includes('Cortico')
    const hasBookingWidget = html.includes('appointment') || html.includes('book-appointment')

    // Check for redirect in meta/JS
    const metaRefresh = html.match(/http-equiv="refresh".*?url=([^"]+)/i)
    const jsRedirect = html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/i)

    if (metaRefresh) {
      console.log(`[${subdomain}] META REDIRECT → ${metaRefresh[1]}`)
      return
    }
    if (jsRedirect) {
      console.log(`[${subdomain}] JS REDIRECT → ${jsRedirect[1]}`)
      return
    }

    // Check if the page has any content or is just a shell
    const bodyContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '').trim()

    const isShell = bodyContent.length < 200 // Very little text content = SPA shell

    // Look for alternative booking links
    const externalLinks = html.match(/href="(https?:\/\/[^"]*(?:inputhealth|medeo|ocean|doctr|janeapp|clinicaid)[^"]*)"/gi)

    if (externalLinks) {
      console.log(`[${subdomain}] External booking links: ${externalLinks.join(', ')}`)
      return
    }

    // Try to find appointment type data in JS bundles
    const appointmentData = html.match(/appointmentTypes?\s*[:=]\s*\[([^\]]+)\]/i)

    console.log(`[${subdomain}] Status: ${bookRes.status}, SPA shell: ${isShell}, Cortico: ${hasCortico}, Content: ${bodyContent.length} chars`)
    if (appointmentData) {
      console.log(`  Appointment types: ${appointmentData[1].substring(0, 200)}`)
    }

  } catch (e: any) {
    console.log(`[${subdomain}] Error: ${e.message}`)
  }
}

async function main() {
  console.log('=== Checking undiscovered Cortico clinics ===\n')

  // Process in batches
  for (let i = 0; i < UNDISCOVERED.length; i += 5) {
    const batch = UNDISCOVERED.slice(i, i + 5)
    await Promise.all(batch.map(checkClinic))
  }

  // Also try locations page for some
  console.log('\n=== Checking /locations/ pages ===')
  for (const sd of ['vycare', 'healthwise', 'wellhealth', 'wellhealthgrandview']) {
    try {
      const res = await fetch(`https://${sd}.cortico.ca/locations/`, {
        headers: { 'User-Agent': 'WalkInNow/1.0' },
      })
      if (res.ok) {
        const html = await res.text()
        const locationLinks = html.match(/href="\/locations\/([^"]+)"/g)
        console.log(`[${sd}] /locations/: ${locationLinks?.join(', ') || 'no location links'}`)
      } else {
        console.log(`[${sd}] /locations/: ${res.status}`)
      }
    } catch (e: any) {
      console.log(`[${sd}] /locations/: ${e.message}`)
    }
  }
}

main()
