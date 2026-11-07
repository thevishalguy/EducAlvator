import { PublicNav, PublicFooter } from "../components/layouts";
import { Eyebrow, Badge } from "../components/ui";

const cookies = [
  { name: "edu_session", type: "Security", purpose: "Cookie that proves you are signed in when the study buddy, quizzes and games ask the AI service for help. Scripts can't read it.", retention: "7 days / until log out" },
  { name: "educalvator_cookie_consent", type: "Essential", purpose: "Cookie that remembers your choice on the cookie notice.", retention: "12 months" },
  { name: "edu_session", type: "Essential", purpose: "A signed, HttpOnly cookie that keeps a student or parent signed in between visits. It holds no password.", retention: "7 days, or until log out" },
  { name: "educalvator.theme", type: "Essential", purpose: "Browser storage that remembers your white or dark theme choice.", retention: "Until cleared" },
  { name: "educalvator.db", type: "Functional", purpose: "Browser storage that holds progress, scores and reports on this device only.", retention: "Until cleared" },
  { name: "educalvator.voice", type: "Functional", purpose: "Browser storage that remembers which Study Buddy voice you picked.", retention: "Until cleared" },
  { name: "educalvator.search.*", type: "Functional", purpose: "Browser storage that remembers a student's searches so the ones used most are suggested first.", retention: "Until cleared" },
  { name: "educalvator.review.*", type: "Functional", purpose: "Browser storage that keeps the latest AI Progress Review so it isn't rewritten on every visit.", retention: "Until cleared" },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 font-medium text-muted">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-bg">
      <PublicNav />
      <div className="mx-auto max-w-4xl px-5 py-10 lg:py-14">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="page-title mb-2 mt-1">Privacy Policy</h1>
        <p className="text-lg font-medium text-muted">
          Last updated 2 November 2026 · EducAlvator is built for children, so we collect as little
          as possible and are clear about everything we keep. This prototype keeps progress and
          reports only in your own browser; sign-in is handled by EducAlvator's own server.
        </p>

        <div className="card mt-10 space-y-10 p-8">
          <Section id="who" title="1. Who this applies to">
            <p>
              EducAlvator is used by two kinds of people: <strong className="text-ink">parents/guardians</strong>,
              who create and manage the family account, and <strong className="text-ink">students</strong>, who
              sign in to learn. A parent account is required before any student profile can be created,
              in line with COPPA-style protections for younger learners.
            </p>
          </Section>

          <Section id="parent-info" title="2. Parent / guardian information">
            <p>When a parent creates an account, we store:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Full name and email address (to identify and contact the account holder).</li>
              <li>A password, stored on EducAlvator's server only as a one-way scrypt hash. The password itself is never saved, and it is never kept in your browser's storage.</li>
              <li>Chosen subscription plan (Free, Pro, or Max) and billing status.</li>
              <li>The list of student profiles created under the account.</li>
            </ul>
            <p>
              Parents can view, edit, or delete their students' accounts at any time from the parent
              Settings page.
            </p>
          </Section>

          <Section id="student-info" title="3. Student information">
            <p>For each student profile, created and consented to by a parent, we store:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>First name (or nickname), grade level, and a chosen avatar.</li>
              <li>A separate login email and password set by the parent.</li>
              <li>Learning activity: subject progress, attendance, quiz results and game scores.</li>
            </ul>
            <p>
              We do <strong className="text-ink">not</strong> ask students for a home address, phone
              number, or any sensitive personal information, and we never show third-party advertising
              to children.
            </p>
          </Section>

          <Section id="use" title="4. How we use information">
            <ul className="list-disc space-y-1 pl-5">
              <li>To run the learning experience — games, resources, quizzes and the AI study buddy. Questions, uploaded files and the student's first name and grade are sent to Google Gemini to generate answers.</li>
              <li>To write the Progress Review on the student report. The report's scores and activity counts (subject progress, quiz topics and percentages, game accuracy, attendance and study time) are sent to Google Gemini to write it; the review is kept only in your browser.</li>
              <li>To show progress reports and leaderboards within a student's own grade.</li>
              <li>To keep accounts secure and prevent misuse.</li>
              <li>To improve EducAlvator using aggregated, de-identified trends — never a named child's data.</li>
            </ul>
          </Section>

          <Section id="cookies" title="5. Cookies we use">
            <p>
              We only use cookies and browser storage that are needed to operate the website safely and
              to remember your preferences. We do not use advertising or cross-site tracking cookies.
            </p>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-ink">
                  <tr>
                    <th className="px-4 py-3 font-bold">Cookie</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Purpose</th>
                    <th className="px-4 py-3 font-bold">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((c) => (
                    <tr key={c.name} className="border-t border-line align-top">
                      <td className="px-4 py-3 text-xs font-bold text-ink">{c.name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={c.type === "Functional" ? "muted" : "accent"}>
                          {c.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.purpose}</td>
                      <td className="px-4 py-3 text-muted">{c.retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm">
              Because these are needed for the website to function (sign-in, security, and saving your
              theme and progress), they stay on whichever option you pick on the cookie notice. You can
              clear them any time through your browser settings, which will sign you out and erase
              progress saved on this device.
            </p>
          </Section>

          <Section id="rights" title="6. Your choices & rights">
            <ul className="list-disc space-y-1 pl-5">
              <li>Parents can delete any student account and its data from Settings.</li>
              <li>Parents can request full account deletion by contacting support.</li>
              <li>You can export or ask for a copy of the data held about your family.</li>
            </ul>
          </Section>

          <Section id="contact" title="7. Contact">
            <p>
              Questions about privacy? Reach our team at{" "}
              <span className="font-bold text-ink">privacy@educalvator.example</span>. This is a
              prototype; no real personal data should be entered.
            </p>
          </Section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
