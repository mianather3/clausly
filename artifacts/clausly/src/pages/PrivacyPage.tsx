import { LegalPageLayout } from "@/components/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="August 6, 2026">
      <h2>1. Introduction</h2>
      <p>
        Clausly ("Clausly," "we," "us," or "our") is a legal document generation and contract
        review platform. This Privacy Policy explains what information we collect, how we use
        it, and the choices you have. By using Clausly, you agree to the practices described
        here.
      </p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> your email address and authentication details, managed through our authentication provider (Clerk).</li>
        <li><strong>Document and contract content:</strong> the text, party names, and terms you submit when generating a document or requesting a contract review.</li>
        <li><strong>Usage data:</strong> basic activity like documents generated, reviews run, and timestamps, used for your dashboard and account limits.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information you provide to:</p>
      <ul>
        <li>Generate legal documents and contract analyses on your behalf</li>
        <li>Maintain your document and review history</li>
        <li>Operate account features like templates, comparisons, and e-signature requests</li>
        <li>Send transactional emails (e.g. signature requests, confirmations) via Resend</li>
        <li>Improve and maintain the reliability of the platform</li>
      </ul>

      <h2>4. AI Processing</h2>
      <p>
        Document generation and contract review are powered by OpenAI's API. The text you submit
        is sent to OpenAI to produce your document or analysis. Your content is not used to train
        Clausly's models, and we do not sell your content to third parties.
      </p>

      <h2>5. Data Storage & Security</h2>
      <p>
        Your data is stored in a PostgreSQL database (hosted by Neon) and is only accessible to
        your authenticated account. We use industry-standard encryption in transit (HTTPS/TLS)
        for all traffic to and from Clausly.
      </p>

      <h2>6. Third-Party Service Providers</h2>
      <p>We rely on the following subprocessors to operate Clausly:</p>
      <ul>
        <li><strong>Clerk</strong> — authentication and account management</li>
        <li><strong>Neon</strong> — database hosting</li>
        <li><strong>OpenAI</strong> — document generation and contract analysis</li>
        <li><strong>Resend</strong> — transactional email delivery</li>
        <li><strong>AWS Elastic Beanstalk</strong> — backend hosting</li>
        <li><strong>Vercel</strong> — frontend hosting</li>
      </ul>
      <p>Each provider processes data only as necessary to deliver their part of the service.</p>

      <h2>7. Cookies</h2>
      <p>
        Clausly uses cookies required for authentication (via Clerk) and basic session
        functionality. We do not use third-party advertising or tracking cookies.
      </p>

      <h2>8. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data at any time
        by emailing <a href="mailto:support@clausly.net">support@clausly.net</a>. You can delete
        individual documents and reviews directly from your dashboard.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>Clausly is not directed at, and is not intended for use by, anyone under the age of 18.</p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected
        by updating the "Last updated" date above.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about this policy? Email us at{" "}
        <a href="mailto:support@clausly.net">support@clausly.net</a>.
      </p>
    </LegalPageLayout>
  );
}
