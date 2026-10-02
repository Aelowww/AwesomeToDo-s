// Plain-language privacy policy and terms. Review and adapt these before publishing widely.
const UPDATED = 'October 2026'

export function PrivacyPolicy() {
  return (
    <div className="legal">
      <p className="muted">Last updated {UPDATED}</p>
      <h3>What we store</h3>
      <ul>
        <li><strong>Your account:</strong> name, email, a securely hashed password (never the password itself), and the school, course, year level and profile photo you choose to add.</li>
        <li><strong>Your planner:</strong> tasks, steps, notes, classes, schedules and grades you enter.</li>
        <li><strong>On your device only:</strong> theme choice, focus-timer settings and focus-session counts are kept in your browser.</li>
      </ul>
      <h3>How it's used</h3>
      <p>Your data is used only to run the app for you. Each account can only see its own data. We don't sell your data or show ads.</p>
      <h3>Study Buddy (AI)</h3>
      <p>
        When you use Study Buddy, your message, the conversation so far, and a summary of your open tasks and class
        schedule are sent to Google's Gemini service to write the answer. Don't share passwords or other sensitive
        personal information in the chat.
      </p>
      <h3>Cookies</h3>
      <p>We use one sign-in cookie to keep you signed in for up to 7 days. There are no tracking or advertising cookies.</p>
      <h3>Your choices</h3>
      <ul>
        <li>Edit your profile and change your email or password anytime in Profile.</li>
        <li>Deleting a task or class removes it from our database. To have your whole account removed, contact the person or school that runs this copy of Awesome ToDo's.</li>
      </ul>
      <h3>Questions</h3>
      <p>Contact the person or school that runs this copy of Awesome ToDo's.</p>
    </div>
  )
}

export function TermsOfUse() {
  return (
    <div className="legal">
      <p className="muted">Last updated {UPDATED}</p>
      <h3>Using Awesome ToDo's</h3>
      <p>Awesome ToDo's is a free planner to help students organize classes, deadlines, grades and study time. By using it, you agree to these terms.</p>
      <h3>Your account</h3>
      <ul>
        <li>Keep your password private. You're responsible for activity on your account.</li>
        <li>Give a real email address so you can reset your password if you forget it.</li>
      </ul>
      <h3>Study Buddy and academic honesty</h3>
      <ul>
        <li>AI answers can be wrong. Double-check important facts with your notes, textbook or teacher.</li>
        <li>Use Study Buddy to learn, plan and practice. Follow your school's rules on AI and don't submit its work as your own.</li>
      </ul>
      <h3>Acceptable use</h3>
      <p>Don't use the app to harass others, break the law, or try to access other people's accounts or data.</p>
      <h3>Availability</h3>
      <p>We work to keep the app running, but it's provided as-is and may sometimes be unavailable. Keep your own copy of anything critical.</p>
      <h3>Changes</h3>
      <p>These terms may be updated. Continuing to use the app means you accept the latest version.</p>
    </div>
  )
}
