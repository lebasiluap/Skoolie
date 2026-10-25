import Link from 'next/link'

export const metadata = { title: 'Get Skoolie | Beta tester installation' }

export default function DownloadPage() {
 return <main style={{maxWidth:820,margin:'0 auto',padding:'48px 24px',color:'var(--text)',lineHeight:1.7}}>
  <Link href="/" style={{color:'var(--teal-deep)'}}>← Skoolie home</Link>
  <h1 style={{fontSize:36,fontWeight:900,marginTop:24}}>Get Skoolie</h1>
  <p>Skoolie is currently available to invited beta testers. Use the account listed in your invitation; these buttons do not bypass tester access.</p>
  <section id="android" style={{padding:'28px 0',scrollMarginTop:24}}><h2 style={{fontSize:26,fontWeight:800}}>Android</h2>
   <ol style={{paddingLeft:24}}><li>Sign in to Google Play with your invited Google account.</li><li>Open the testing page below and choose to become a tester.</li><li>Follow its Google Play link to install or update Skoolie.</li></ol>
   <a className="btn-primary" href="https://play.google.com/apps/testing/com.skoolie.app" style={{display:'inline-block',padding:'12px 20px',borderRadius:16,background:'var(--teal)',color:'white',fontWeight:800}}>Join the Android test</a>
   <p>Already enrolled? <a href="https://play.google.com/store/apps/details?id=com.skoolie.app" style={{textDecoration:'underline'}}>Open Skoolie in Google Play</a>.</p>
   <p>Keep your testing enrollment until Paul confirms testing is complete, even after your two paid sessions. If access is unavailable, check the Google account selected in your browser and Play Store.</p>
  </section>
  <section id="ios" style={{padding:'28px 0',borderTop:'1px solid var(--border)',scrollMarginTop:24}}><h2 style={{fontSize:26,fontWeight:800}}>iPhone and iPad</h2>
   <ol style={{paddingLeft:24}}><li>Install Apple’s TestFlight app using the button below.</li><li>On your device, open your personal TestFlight invitation email and tap its invitation link.</li><li>Accept the invitation, then install or update Skoolie Med inside TestFlight.</li></ol>
   <a href="https://apps.apple.com/app/testflight/id899247664" style={{display:'inline-block',padding:'12px 20px',borderRadius:16,background:'var(--teal)',color:'white',fontWeight:800}}>Install Apple TestFlight</a>
   <p>This installs TestFlight, not Skoolie itself. Your personal invitation grants access to Skoolie; we do not publish an unrestricted invitation here.</p>
  </section>
  <section style={{padding:'24px 0',borderTop:'1px solid var(--border)'}}><h2 style={{fontSize:22,fontWeight:800}}>Need help or want to report a bug?</h2><p>Email <a href="mailto:lebasiluap@gmail.com" style={{textDecoration:'underline'}}>the beta coordinator</a> from your invited email. Include your device, app build and what happened. Never send passwords or payment details. iOS testers can also use TestFlight → Skoolie Med → Send Beta Feedback; Android testers can use private Google Play testing feedback.</p></section>
 </main>
}
