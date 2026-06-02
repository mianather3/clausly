import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { CreateDocumentBody, GetDocumentParams, DeleteDocumentParams, ListDocumentsResponse, GetDocumentResponse } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/requireAuth";
import { openai } from "../../lib/openai";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Footer,
  convertInchesToTwip,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function stripMarkdownBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
}

const SIGNATURE_LINE = "________________________________"; // 32 underscores — do NOT shorten
const SIGNATURE_LABEL_RE =
  /^(\s*)(By|Name|Printed?\s+Name|Title|Date|Signature|Witness)(\s*):\s*_{0,}\s*$/i;

function normalizeSignatureLines(content: string): string {
  return content
    .split("\n")
    .map((rawLine) => {
      // Strip markdown bold/italic first so **By:** becomes By:
      const line = rawLine
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/\*(.+?)\*/g, "$1");

      const m = line.match(SIGNATURE_LABEL_RE);
      if (m) {
        return `${m[1]}${m[2]}: ${SIGNATURE_LINE}`;
      }
      // Bare underscore-only line — normalize to full width
      if (/^\s*_{3,}\s*$/.test(line)) {
        return SIGNATURE_LINE;
      }
      return line;
    })
    .join("\n");
}

const router: IRouter = Router();

const DOC_TYPE_LABELS: Record<string, string> = {
  nda: "Non-Disclosure Agreement (NDA)",
  privacy_policy: "Privacy Policy",
  contractor_agreement: "Independent Contractor Agreement",
  terms_of_service: "Terms of Service",
};

function getCurrentDate(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getNdaPrompt(partyA: string, partyB: string, jurisdiction: string, keyTerms: string, additionalContext: string): string {
  return `You are a senior corporate attorney with 20 years of experience drafting commercial contracts. Draft a complete, attorney-quality Non-Disclosure Agreement. Output ONLY the document text — no preamble, no explanation, no markdown code blocks.

CRITICAL INSTRUCTION — READ BEFORE DRAFTING:
- The Disclosing Party's full legal name is: ${partyA}
- The Receiving Party's full legal name is: ${partyB}
- You MUST use these actual names throughout the entire document. NEVER write "Party A" or "Party B" anywhere in the document. NEVER write "[Party Name]" or "[Insert Name]" placeholders. Use the real names provided above.
- The effective date is: ${getCurrentDate()}. Write this exact date in the document. Do NOT leave a blank or underscore for the date.
- Governing jurisdiction: ${jurisdiction}
- Key terms and context: ${keyTerms}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

DRAFTING RULES:
1. Current year is ${getCurrentYear()} — use this year; never hardcode any other year.
2. In the opening paragraph, define a short form for each party in parentheses (e.g., "TechNova Inc." as ("TechNova")). Use that short name for every subsequent reference. Never revert to "Party A" or "Party B".
3. Capitalize all defined terms (e.g., Confidential Information, Permitted Purpose) consistently throughout.
4. Formal legal drafting style: active voice where possible, present tense for obligations.
5. Every section has a numbered heading in ALL CAPS, followed by numbered subsections.

REQUIRED SECTIONS — include every one of these, in this exact order, numbered 1 through 14:

1. OPENING PARAGRAPH
Recite the full legal name of each party, their state of incorporation, principal place of business, and the effective date (${getCurrentDate()}). Define short-form names in parentheses.

2. RECITALS
Two or three WHEREAS recitals establishing the business relationship and the Permitted Purpose. Define "Confidential Information" broadly here: written, oral, electronic, and tangible information including trade secrets, business plans, financial data, technical data, customer lists, and any other information disclosed by either party in connection with the Permitted Purpose.

3. DEFINITIONS
Define terms not already defined in the Recitals: Disclosing Party, Receiving Party, Representatives (limited to employees, directors, officers, attorneys, accountants, and advisors who have a need to know and are bound by obligations no less restrictive than this Agreement).

4. OBLIGATIONS OF CONFIDENTIALITY
Subsections covering: (a) maintain strict confidence; (b) limit disclosure solely to Representatives; (c) use Confidential Information solely for the Permitted Purpose; (d) promptly notify Disclosing Party upon discovering any unauthorized disclosure; (e) use at least the same degree of care as each party uses to protect its own confidential information, but no less than reasonable care.

5. EXCLUSIONS FROM CONFIDENTIAL INFORMATION
Standalone section. Exclusions: (a) publicly available through no breach by Receiving Party; (b) already known prior to disclosure (evidenced in writing); (c) independently developed without use of Confidential Information; (d) received from a third party under no confidentiality obligation; (e) required to be disclosed by law or court order, provided Receiving Party gives prompt written notice and cooperates with any protective order effort.

6. OWNERSHIP OF CONFIDENTIAL INFORMATION
All Confidential Information remains the sole and exclusive property of the Disclosing Party. This Agreement grants no license, right, or interest in any Confidential Information.

7. RETURN OF CONFIDENTIAL INFORMATION
Upon termination or written request, Receiving Party shall promptly (within 10 business days) return or certifiably destroy all Confidential Information and all copies, summaries, and extracts, and provide written certification of destruction upon request.

8. TERM AND TERMINATION
Specify duration based on key terms, or default to three (3) years. Either party may terminate upon thirty (30) days' written notice. Confidentiality obligations survive termination for five (5) years.

9. INDEMNIFICATION
Breaching party shall indemnify, defend, and hold harmless the non-breaching party from all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from any breach of this Agreement.

10. REMEDIES
The parties acknowledge that any breach would cause irreparable harm for which monetary damages would be inadequate. The Disclosing Party is entitled to seek specific performance and injunctive or equitable relief without posting bond or proving actual damages, in addition to all remedies at law or in equity.

11. NOTICES
All notices must be in writing; deemed delivered when: (i) personally delivered; (ii) sent by confirmed facsimile; (iii) three (3) business days after deposit in certified U.S. mail, return receipt requested; or (iv) one (1) business day after deposit with a nationally recognized overnight courier. Include full address block placeholders for each party: ATTN / Name / Address / Phone / Email.

12. DISPUTE RESOLUTION
Governing law: ${jurisdiction}. Exclusive jurisdiction and venue in the state and federal courts of ${jurisdiction}. Parties consent to personal jurisdiction. Parties shall first attempt good-faith negotiation for 30 days before initiating litigation.

13. GENERAL
Label this section "GENERAL". Include: (a) Amendment — only by written instrument signed by both parties; (b) Waiver — failure to enforce is not a waiver; (c) Counterparts — may be executed in counterparts, electronic signatures valid; (d) Disclaimer of Warranties — Confidential Information provided "as is," Disclosing Party makes no representations as to accuracy or completeness; (e) Assignment and Binding Effect — neither party may assign without prior written consent of the other, except in connection with a merger or acquisition; (f) Entire Agreement — this Agreement supersedes all prior agreements regarding its subject matter.

14. SIGNATURE BLOCK
One block per party, headed by the party's defined short name. Each block must contain exactly these four lines, in this order, with exactly 32 underscore characters after the colon and space:

By: ________________________________
Name: ________________________________
Title: ________________________________
Date: ________________________________

Do not use fewer underscores. Do not substitute dashes or blanks.`;
}

function getContractorPrompt(partyA: string, partyB: string, jurisdiction: string, keyTerms: string, additionalContext: string): string {
  return `You are a senior corporate attorney with 20 years of experience drafting commercial contracts. Draft a complete, attorney-quality Independent Contractor Agreement using the following information. Output ONLY the document text — no preamble, no explanation, no markdown code blocks.

PARTIES:
- Company (Client): ${partyA}
- Independent Contractor: ${partyB}
- Jurisdiction: ${jurisdiction}
- Effective Date: ${getCurrentDate()}
- Key Terms / Services Description: ${keyTerms}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

DRAFTING RULES:
1. Use the current year (${getCurrentYear()}) — never hardcode any other year.
2. Use the actual party names throughout. Define short names in the opening paragraph (e.g., "TechNova Inc." as ("Company") and "John Smith" as ("Contractor")).
3. Capitalize all defined terms consistently throughout.
4. Formal legal drafting style; every section has a bold numbered heading with numbered subsections.

REQUIRED SECTIONS IN THIS EXACT ORDER:
1. OPENING PARAGRAPH — full legal names, states/countries, effective date, and short-form definitions.
2. RECITALS — brief WHEREAS recitals establishing that Company desires to retain Contractor and Contractor desires to provide the Services on the terms set forth herein.
3. DEFINITIONS — Services (as further described in Exhibit A or as specified in the key terms), Work Product, Deliverables, Confidential Information, Intellectual Property Rights.
4. SERVICES — detailed description of Services to be provided, timeline, any milestones or Deliverables. Reference the key terms: ${keyTerms}. Include that Contractor shall provide all equipment, tools, and resources unless otherwise agreed in writing.
5. COMPENSATION — payment amount (infer reasonable amount from key terms or state "as agreed by the parties"), payment schedule (upon completion of each milestone or monthly), invoicing requirements (Contractor submits invoices within 5 business days of milestone completion), net-30 payment terms, and late payment interest at 1.5% per month on overdue amounts.
6. INDEPENDENT CONTRACTOR STATUS — (a) Contractor is an independent contractor, not an employee, agent, or partner; (b) Company shall not withhold taxes or provide employee benefits; (c) Contractor is solely responsible for all applicable taxes; (d) Contractor retains discretion over the manner and means of performing Services; (e) Contractor has no authority to bind Company to any contract or obligation.
7. INTELLECTUAL PROPERTY AND WORK PRODUCT OWNERSHIP — (a) All Work Product and Deliverables created by Contractor in connection with this Agreement shall be deemed "work made for hire" to the fullest extent permitted by law; (b) to the extent any Work Product does not qualify as work made for hire, Contractor hereby irrevocably assigns all right, title, and interest (including all Intellectual Property Rights) to Company; (c) PRE-EXISTING IP CARVEOUT: Contractor retains ownership of all tools, methodologies, frameworks, libraries, and other intellectual property developed prior to this Agreement or independently of the Services ("Background IP"); Company receives only a non-exclusive, royalty-free license to use Background IP solely to the extent incorporated in and necessary to use the Deliverables; (d) Contractor represents that the Work Product will not infringe any third-party intellectual property rights.
8. CONFIDENTIALITY — same substantive obligations as a bilateral NDA: maintain strict confidence, limit disclosure to those with need to know, use only for the Permitted Purpose, same degree of care as own confidential information (no less than reasonable care), promptly notify of unauthorized disclosure. Exclusions mirror standard NDA exclusions (publicly available, prior knowledge, independent development, third party disclosure, legally required). Survival: confidentiality obligations survive termination for three (3) years.
9. NON-SOLICITATION — during the term and for twelve (12) months following termination, Contractor shall not directly or indirectly solicit, hire, or engage any employee or client of Company whom Contractor became aware of in connection with the Services. NOTE: Do NOT include any non-compete clause — non-compete clauses are not appropriate here and may be unenforceable.
10. REPRESENTATIONS AND WARRANTIES — Contractor represents and warrants that: (a) Contractor has full right, power, and authority to enter into and perform this Agreement; (b) the Work Product will be Contractor's original work and will not infringe any third-party rights; (c) the Work Product will conform to the specifications in Exhibit A (or as otherwise agreed); (d) Contractor will perform the Services in a professional and workmanlike manner.
11. INDEMNIFICATION — (a) Contractor shall indemnify, defend, and hold harmless Company from claims arising from Contractor's breach of this Agreement, negligence, or willful misconduct; (b) Company shall indemnify, defend, and hold harmless Contractor from claims arising from Company's breach of this Agreement or Company's use of the Work Product in a manner not contemplated by this Agreement.
12. LIMITATION OF LIABILITY — NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES. EACH PARTY'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES PAID OR PAYABLE BY COMPANY TO CONTRACTOR IN THE THREE (3) MONTHS PRECEDING THE CLAIM.
13. TERM AND TERMINATION — (a) Term begins on the Effective Date and continues until completion of the Services or until terminated; (b) Termination for Cause: either party may terminate immediately upon written notice if the other party materially breaches and fails to cure within fifteen (15) days of written notice; (c) Termination for Convenience: Company may terminate upon fifteen (15) days' written notice; upon such termination, Company shall pay Contractor for all Services performed through the termination date; (d) Surviving provisions: Sections on IP Ownership, Confidentiality, Non-Solicitation, Representations and Warranties, Indemnification, Limitation of Liability, and Dispute Resolution survive termination.
14. DISPUTE RESOLUTION — governing law of ${jurisdiction}; good-faith negotiation for thirty (30) days before filing any action; exclusive jurisdiction and venue in the state and federal courts of ${jurisdiction}.
15. NOTICES — same format as NDA: in writing, deemed delivered when personally delivered, confirmed facsimile, 3 business days after certified mail, or 1 business day after overnight courier. Full address block placeholders for both parties.
16. GENERAL — (a) Amendment; (b) Waiver; (c) Counterparts and electronic signatures; (d) Severability; (e) Assignment (neither party may assign without written consent, except Company may assign in connection with a merger or acquisition); (f) Entire Agreement.
17. SIGNATURE BLOCK — use the actual defined short names for each party (Company and Contractor) as the heading for each block (one block per party). Format the signature block EXACTLY as shown below, on separate lines, with each label followed by a colon, a space, and exactly thirty-two (32) underscore characters. Do NOT use short underscores like "_______". Use this exact template for EACH party:

[Defined Short Name of Party]
By: ________________________________
Name: ________________________________
Title: ________________________________
Date: ________________________________

18. EXHIBIT A — DESCRIPTION OF SERVICES — placeholder section at the end, pre-filled with the key terms provided: ${keyTerms}.`;
}

function getPrivacyPolicyPrompt(partyA: string, jurisdiction: string, keyTerms: string, additionalContext: string): string {
  return `You are a senior privacy attorney with expertise in GDPR, CCPA, and U.S. privacy law. Draft a complete, legally compliant Privacy Policy for the following company. Output ONLY the document text — no preamble, no explanation, no markdown code blocks.

COMPANY INFORMATION:
- Company Name: ${partyA}
- Jurisdiction: ${jurisdiction}
- Service Description / Key Terms: ${keyTerms}
- Effective Date: ${getCurrentDate()}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

DRAFTING RULES:
1. Use the current year (${getCurrentYear()}) — never hardcode any other year.
2. Use "${partyA}" (or a short form defined in the opening) consistently throughout.
3. Write in plain, accessible English — users should understand their rights. Avoid jargon.
4. Every section has a numbered heading in Title Case (e.g., "1. Information We Collect") followed by body paragraphs and lettered subsections.
5. CAPITALIZATION — THIS IS CRITICAL: Write all body text, subsections, and list items in normal English sentence case — meaning the first word of every sentence is capitalized, proper nouns (company names, product names, jurisdiction names) are capitalized, and all other words are lowercase. Do NOT write entire sentences, subsections, or list items in ALL CAPS. The only text that may appear in ALL CAPS is: (a) any warranty disclaimer or limitation of liability clause that is legally required to be conspicuous (e.g., "THE SERVICE IS PROVIDED 'AS IS'..."). Every other sentence, heading, subsection label, and list item must be in normal English sentence case.

REQUIRED SECTIONS IN THIS EXACT ORDER (use these exact Title Case heading names — do NOT convert them to all caps):
1. Introduction — who we are ("${partyA}" or "we," "us," "our"), what services this Policy covers, and that by using the Service users agree to this Policy. Include effective date and "Last Updated" date (both set to ${getCurrentDate()}).
2. Information We Collect — subsections: (a) Personal information: name, email address, billing/payment information, account credentials, and other information users provide; (b) Usage data: IP address, browser type and version, pages visited, time spent on pages, referring URLs, device identifiers; (c) Cookies and tracking technologies: types of cookies used (session cookies, persistent cookies, analytics cookies), purpose of each, and that users can control cookies through browser settings.
3. How We Use Your Information — subsections covering: (a) to provide, operate, and maintain the Service; (b) to process payments and send receipts; (c) to send transactional and administrative communications (account confirmations, security alerts); (d) to improve and personalize the Service; (e) to analyze usage and trends; (f) to comply with legal obligations; (g) if the Service uses AI (OpenAI API): clearly disclose that user-submitted contract text may be processed by OpenAI's API to generate analysis, and include a note that users should not submit documents containing sensitive personal information of third parties.
4. Legal Basis for Processing (GDPR) — for users in the EEA: (a) Consent — where you have given consent; (b) Contractual necessity — processing necessary to provide the Service; (c) Legitimate interests — improving the Service, preventing fraud; (d) Legal obligation — complying with applicable law.
5. Data Sharing and Disclosure — (a) We do not sell, rent, or trade personal information; (b) Service providers: we share data with trusted third-party providers (payment processors, cloud hosting, analytics) who process data on our behalf under confidentiality obligations; (c) Legal requirements: we may disclose data when required by law, court order, or government request; (d) Business transfers: in connection with a merger, acquisition, or sale of assets, user data may be transferred.
6. Data Retention — we retain personal information for as long as your account is active or as needed to provide Services. Usage data is retained for a shorter period except where used for security or legal compliance. We will delete or anonymize your data upon request, subject to legal retention requirements.
7. Your Rights — subsections: (a) GDPR rights (for EEA users): right to access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, objection to processing, right to withdraw consent; (b) CCPA rights (for California residents): right to know what personal information is collected, right to delete, right to opt out of sale (we do not sell data), right to non-discrimination; (c) How to exercise rights: contact us at [contact email], we will respond within 30 days.
8. Cookies — detailed cookie policy: (a) what cookies are; (b) types: necessary cookies (essential for functionality, cannot be disabled), analytics cookies (understand how users use the Service, can be disabled), marketing/preference cookies (remember user preferences); (c) how to manage or opt out of cookies through browser settings or opt-out tools.
9. Children's Privacy — the Service is not directed to children under the age of 13 (or 16 for EEA users). We do not knowingly collect personal information from children. If we discover we have collected data from a child, we will promptly delete it.
10. Security — we implement commercially reasonable technical and organizational measures to protect your personal information, including encryption in transit (TLS) and at rest. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
11. Third-Party Links — the Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage users to review their privacy policies.
12. Changes to This Policy — we may update this Privacy Policy from time to time. We will notify users of material changes by email or prominent notice on the Service at least 30 days before the change takes effect. Continued use of the Service after the effective date constitutes acceptance of the updated Policy.
13. Contact Us — for privacy-related questions or to exercise your rights, contact us at: [Company Name: ${partyA}], [Address], [Email], [Phone].`;
}

function getTermsOfServicePrompt(partyA: string, jurisdiction: string, keyTerms: string, additionalContext: string): string {
  return `You are a senior technology attorney with expertise in SaaS agreements. Draft a complete, attorney-quality Terms of Service agreement for the following company. Output ONLY the document text — no preamble, no explanation, no markdown code blocks.

COMPANY INFORMATION:
- Company Name: ${partyA}
- Jurisdiction: ${jurisdiction}
- Service Description / Key Terms: ${keyTerms}
- Effective Date: ${getCurrentDate()}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

DRAFTING RULES:
1. Use the current year (${getCurrentYear()}) — never hardcode any other year.
2. Use "${partyA}" (or a short form defined in the Definitions) consistently throughout.
3. Every section has a bold numbered heading with numbered subsections.
4. Formal legal drafting style.

REQUIRED SECTIONS IN THIS EXACT ORDER:
1. INTRODUCTION AND ACCEPTANCE — who we are, that these Terms govern use of the Service, and that by creating an account or using the Service users accept these Terms. Include effective date (${getCurrentDate()}).
2. DEFINITIONS — Service (the [describe the service based on key terms: ${keyTerms}] platform operated by ${partyA}), User (any person who accesses the Service), Account (a registered account), Content (any information, text, or files uploaded by Users), Subscription (a paid plan granting access to premium features).
3. ELIGIBILITY — users must be at least 18 years old; by accepting, users represent they have the legal capacity to enter into binding contracts; users signing on behalf of a company represent they have authority to bind that company.
4. ACCOUNT REGISTRATION — users must provide accurate and complete information; users are responsible for maintaining the confidentiality of account credentials; users must notify ${partyA} immediately of any unauthorized access or use of their account; ${partyA} reserves the right to suspend accounts with inaccurate information.
5. SUBSCRIPTION AND PAYMENT — (a) Service is offered on subscription plans as described on the pricing page; (b) subscriptions auto-renew unless cancelled before the renewal date; (c) payment is processed through a third-party payment processor; (d) refund policy: no refunds for partial subscription periods; (e) ${partyA} reserves the right to change pricing with 30 days' advance written notice to subscribers.
6. ACCEPTABLE USE — users may use the Service only for lawful purposes and in accordance with these Terms. Users shall NOT: (a) violate any applicable law or regulation; (b) infringe any intellectual property rights; (c) upload malicious code or interfere with the Service's operation; (d) attempt to gain unauthorized access to the Service or other users' accounts; (e) use the Service to harass, defame, or harm others; (f) resell or sublicense access to the Service without authorization.
7. INTELLECTUAL PROPERTY — (a) Company IP: ${partyA} owns all right, title, and interest in the Service, including all software, designs, trademarks, and content created by ${partyA}; (b) User Content: Users retain ownership of Content they upload; (c) License Grant: by uploading Content, Users grant ${partyA} a limited, non-exclusive, royalty-free license to use, process, store, and display Content solely as necessary to provide the Service; (d) No Other License: these Terms do not grant Users any license to ${partyA}'s intellectual property beyond the right to use the Service as described herein.
8. DISCLAIMER REGARDING LEGAL ADVICE — IMPORTANT: DOCUMENTS GENERATED BY THE SERVICE ARE FOR INFORMATIONAL PURPOSES ONLY AND DO NOT CONSTITUTE LEGAL ADVICE. THE SERVICE IS NOT A LAW FIRM AND IS NOT A SUBSTITUTE FOR THE ADVICE OF A LICENSED ATTORNEY. USERS SHOULD CONSULT A QUALIFIED ATTORNEY LICENSED IN THEIR JURISDICTION BEFORE RELYING ON ANY GENERATED DOCUMENT FOR ANY LEGAL PURPOSE.
9. DISCLAIMER OF WARRANTIES — THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. ${partyA.toUpperCase()} DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
10. LIMITATION OF LIABILITY — TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW: (a) ${partyA.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES; (b) ${partyA.toUpperCase()}'S AGGREGATE LIABILITY TO ANY USER FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (i) THE FEES PAID BY SUCH USER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM OR (ii) ONE HUNDRED DOLLARS ($100).
11. INDEMNIFICATION — Users shall indemnify, defend, and hold harmless ${partyA} and its officers, directors, employees, and agents from any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) User's use of the Service; (b) User's violation of these Terms; (c) User's violation of any applicable law or third-party rights; or (d) User's Content.
12. TERMINATION — (a) ${partyA} may suspend or terminate any User's account at any time for violation of these Terms, with or without notice; (b) Users may cancel their subscription at any time through account settings; (c) upon termination, User's right to access the Service terminates immediately; (d) ${partyA} will retain User Content for 30 days after termination, after which it may be deleted.
13. DISPUTE RESOLUTION — (a) Informal Resolution: before filing any claim, the parties agree to first attempt resolution by contacting ${partyA} at [email]; (b) Governing Law: these Terms are governed by the laws of ${jurisdiction}; (c) Arbitration: any dispute not resolved informally shall be resolved by binding arbitration administered under the rules of JAMS or AAA, conducted in ${jurisdiction}; (d) Class Action Waiver: users waive any right to participate in a class action lawsuit or class-wide arbitration; (e) Exception: either party may seek injunctive relief in court to prevent irreparable harm.
14. NOTICES — Company notices to Users will be sent to the email address associated with the User's account. Notices to ${partyA} must be sent in writing by certified mail or overnight courier to ${partyA}'s principal place of business.
15. GENERAL — (a) Amendment: ${partyA} may update these Terms at any time with notice to Users; continued use constitutes acceptance; (b) Waiver; (c) Severability; (d) Entire Agreement: these Terms, together with the Privacy Policy, constitute the entire agreement between the parties regarding the Service; (e) Assignment: ${partyA} may assign these Terms in connection with a merger or acquisition.`;
}

async function generateDocument(
  documentType: string,
  partyA: string,
  partyB: string | undefined,
  keyTerms: string,
  jurisdiction: string | undefined,
  additionalContext: string | undefined
): Promise<string> {
  const jur = jurisdiction || "United States (general)";
  const ctx = additionalContext || "";
  const b = partyB || "";

  let prompt: string;
  switch (documentType) {
    case "nda":
      prompt = getNdaPrompt(partyA, b || "the Receiving Party", jur, keyTerms, ctx);
      break;
    case "contractor_agreement":
      prompt = getContractorPrompt(partyA, b || "the Contractor", jur, keyTerms, ctx);
      break;
    case "privacy_policy":
      prompt = getPrivacyPolicyPrompt(partyA, jur, keyTerms, ctx);
      break;
    case "terms_of_service":
      prompt = getTermsOfServicePrompt(partyA, jur, keyTerms, ctx);
      break;
    default: {
      const docLabel = DOC_TYPE_LABELS[documentType] || documentType;
      prompt = `You are a senior corporate attorney. Draft a complete, professional ${docLabel} using the following information. Output ONLY the document text — no preamble, no markdown code blocks.

Party A: ${partyA}
${partyB ? `Party B: ${partyB}` : ""}
Key Terms: ${keyTerms}
Jurisdiction: ${jur}
Effective Date: ${getCurrentDate()}
${ctx ? `Additional Context: ${ctx}` : ""}

Use numbered sections, define all key terms, use formal legal drafting style, and include a signature block.`;
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert legal document drafter. Output only the document text with no explanations, no preamble, and no markdown formatting markers like ``` or **. Use plain text formatting. For NDAs and legal contracts, use ALL CAPS for section headings. For Privacy Policies and Terms of Service, use Title Case for section headings and normal sentence case for all body text."
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 6000,
  });

  return response.choices[0]?.message?.content ?? "";
}

function buildDocxFromText(title: string, content: string): Document {
  const lines = content.split("\n");
  const children: Paragraph[] = [];

  // Title — Heading 1, large, centered, bold
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: stripMarkdownBold(title),
          font: "Times New Roman",
          size: 32, // 16pt
          bold: true,
        }),
      ],
    })
  );

  for (const rawLine of lines) {
    const line = stripMarkdownBold(rawLine.trim());
    if (!line) {
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      continue;
    }

    // Subsection FIRST (e.g. "2.1 ...", "5.1.3 ...") — must precede numbered-section check
    const isSubSection = /^\d+\.\d+/.test(line);
    // Numbered top-level section: "1. RECITALS" or "1. Definitions"
    const isNumberedSection = !isSubSection && /^\d+\.\s+\S/.test(line);
    // ALL-CAPS heading without a number (e.g. "RECITALS", "GENERAL")
    const isAllCapsHeading =
      !isSubSection &&
      !isNumberedSection &&
      line.length > 2 &&
      line.length < 80 &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line) &&
      !/[.;:](\s|$)/.test(line); // not a sentence

    if (isNumberedSection || isAllCapsHeading) {
      // Heading 2 — section titles like "1. RECITALS"
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
          children: [
            new TextRun({
              text: line,
              font: "Times New Roman",
              size: 26, // 13pt
              bold: true,
            }),
          ],
        })
      );
    } else if (isSubSection) {
      // Subsection (e.g. "2.1 ...") — normal paragraph with bold subsection number prefix
      const match = line.match(/^(\d+(?:\.\d+)+\.?)(\s+)(.*)$/);
      if (match) {
        const [, prefix, , rest] = match;
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({ text: `${prefix} `, font: "Times New Roman", size: 24, bold: true }),
              new TextRun({ text: rest, font: "Times New Roman", size: 24 }),
            ],
          })
        );
      } else {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [new TextRun({ text: line, font: "Times New Roman", size: 24, bold: true })],
          })
        );
      }
    } else {
      // Body — normal Times New Roman 12pt
      children.push(
        new Paragraph({
          spacing: { after: 120, line: 300 },
          children: [
            new TextRun({
              text: line,
              font: "Times New Roman",
              size: 24, // 12pt
            }),
          ],
        })
      );
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "Times New Roman",
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Created with Clausly \u2014 clausly.net",
                    font: "Times New Roman",
                    size: 16,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

// ─── PDF generation (server-side, pdf-lib) ────────────────────────────────────

type PdfLineKind = "title" | "section" | "subsection" | "body" | "blank";

interface PdfLine {
  kind: PdfLineKind;
  text: string;
  boldPrefix?: string; // for subsections, the "2.1" part rendered bold
}

function classifyLines(title: string, content: string): PdfLine[] {
  const out: PdfLine[] = [];
  out.push({ kind: "title", text: stripMarkdownBold(title) });

  for (const rawLine of content.split("\n")) {
    const line = stripMarkdownBold(rawLine.trim());
    if (!line) {
      out.push({ kind: "blank", text: "" });
      continue;
    }
    const isSubSection = /^\d+\.\d+/.test(line);
    const isNumberedSection = !isSubSection && /^\d+\.\s+\S/.test(line);
    const isAllCapsHeading =
      !isSubSection &&
      !isNumberedSection &&
      line.length > 2 &&
      line.length < 80 &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line) &&
      !/[.;:](\s|$)/.test(line);

    if (isNumberedSection || isAllCapsHeading) {
      out.push({ kind: "section", text: line });
    } else if (isSubSection) {
      const m = line.match(/^(\d+(?:\.\d+)+\.?)(\s+)(.*)$/);
      if (m) out.push({ kind: "subsection", text: m[3], boldPrefix: m[1] });
      else out.push({ kind: "subsection", text: line });
    } else {
      out.push({ kind: "body", text: line });
    }
  }
  return out;
}

function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number
): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // word itself longer than line — hard-break
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let buf = "";
        for (const ch of word) {
          const tryBuf = buf + ch;
          if (font.widthOfTextAtSize(tryBuf, size) <= maxWidth) {
            buf = tryBuf;
          } else {
            if (buf) lines.push(buf);
            buf = ch;
          }
        }
        current = buf;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPdfFromText(title: string, content: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const PAGE_WIDTH = 612; // 8.5 in * 72
  const PAGE_HEIGHT = 792; // 11 in * 72
  const MARGIN = 72; // 1 inch
  const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const FOOTER_RESERVE = 36; // space above bottom margin for page number

  const SIZES = {
    title: 16,
    section: 13,
    subsection: 12,
    body: 12,
  };
  const LINE_HEIGHTS = {
    title: 22,
    section: 18,
    subsection: 16,
    body: 16,
  };
  const SPACE_BEFORE = {
    title: 0,
    section: 14,
    subsection: 8,
    body: 0,
    blank: 8,
  };
  const SPACE_AFTER = {
    title: 18,
    section: 6,
    subsection: 4,
    body: 4,
    blank: 0,
  };

  const lines = classifyLines(title, content);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;
  const pages: import("pdf-lib").PDFPage[] = [page];

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < MARGIN + FOOTER_RESERVE) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      cursorY = PAGE_HEIGHT - MARGIN;
    }
  };

  for (const ln of lines) {
    if (ln.kind === "blank") {
      cursorY -= SPACE_BEFORE.blank;
      continue;
    }

    const before = SPACE_BEFORE[ln.kind];
    const after = SPACE_AFTER[ln.kind];
    cursorY -= before;

    const size = SIZES[ln.kind];
    const lineHeight = LINE_HEIGHTS[ln.kind];
    const isBoldLine = ln.kind === "title" || ln.kind === "section";
    const font = isBoldLine ? timesBold : timesRoman;

    if (ln.kind === "subsection" && ln.boldPrefix) {
      // First wrapped line gets the bold prefix; remaining wrap normally
      const prefixWithSpace = `${ln.boldPrefix} `;
      const prefixWidth = timesBold.widthOfTextAtSize(prefixWithSpace, size);
      const firstLineWidth = TEXT_WIDTH - prefixWidth;
      const wrappedFirst = wrapText(ln.text, timesRoman, size, firstLineWidth);
      const firstLine = wrappedFirst[0] ?? "";
      const restText = wrappedFirst.slice(1).join(" ");
      const restWrapped = restText ? wrapText(restText, timesRoman, size, TEXT_WIDTH) : [];

      ensureSpace(lineHeight);
      page.drawText(prefixWithSpace, {
        x: MARGIN,
        y: cursorY - size,
        size,
        font: timesBold,
        color: rgb(0, 0, 0),
      });
      page.drawText(firstLine, {
        x: MARGIN + prefixWidth,
        y: cursorY - size,
        size,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      cursorY -= lineHeight;

      for (const wl of restWrapped) {
        ensureSpace(lineHeight);
        page.drawText(wl, {
          x: MARGIN,
          y: cursorY - size,
          size,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        cursorY -= lineHeight;
      }
    } else {
      const wrapped = wrapText(ln.text, font, size, TEXT_WIDTH);
      for (const wl of wrapped) {
        ensureSpace(lineHeight);
        let x = MARGIN;
        if (ln.kind === "title") {
          const w = font.widthOfTextAtSize(wl, size);
          x = (PAGE_WIDTH - w) / 2;
        }
        page.drawText(wl, {
          x,
          y: cursorY - size,
          size,
          font,
          color: rgb(0, 0, 0),
        });
        cursorY -= lineHeight;
      }
    }

    cursorY -= after;
  }

  // Footer: page number (center) + watermark (right)
  const totalPages = pages.length;
  const watermarkText = "Created with Clausly \u2014 clausly.net";
  pages.forEach((p, idx) => {
    const label = `${idx + 1}`;
    const w = timesRoman.widthOfTextAtSize(label, 10);
    void totalPages;
    p.drawText(label, {
      x: (PAGE_WIDTH - w) / 2,
      y: MARGIN / 2,
      size: 10,
      font: timesRoman,
      color: rgb(0.3, 0.3, 0.3),
    });
    const ww = timesRoman.widthOfTextAtSize(watermarkText, 8);
    p.drawText(watermarkText, {
      x: PAGE_WIDTH - MARGIN - ww,
      y: MARGIN / 2,
      size: 8,
      font: timesRoman,
      color: rgb(0.6, 0.6, 0.6),
    });
  });

  return pdfDoc.save();
}

router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(documentsTable.createdAt);
  res.json(ListDocumentsResponse.parse(docs));
});

router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentType, partyA, partyB, keyTerms, jurisdiction, additionalContext } = parsed.data;
  const userId = (req as any).userId as string;

  const content = await generateDocument(
    documentType,
    partyA,
    partyB ?? undefined,
    keyTerms,
    jurisdiction ?? undefined,
    additionalContext ?? undefined
  );

  const docLabel = DOC_TYPE_LABELS[documentType] || documentType;
  const title = `${docLabel} - ${partyA}${partyB ? ` & ${partyB}` : ""}`;

  const [doc] = await db
    .insert(documentsTable)
    .values({
      userId,
      documentType,
      title,
      partyA,
      partyB: partyB ?? null,
      content,
      metadata: null,
    })
    .returning();

  res.status(201).json(GetDocumentResponse.parse(doc));
});

router.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(GetDocumentResponse.parse(doc));
});

router.post("/documents/download-docx", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { title?: unknown; content?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!title || title.length > 500) {
    res.status(400).json({ error: "Invalid title" });
    return;
  }
  if (!content || content.length > 500_000) {
    res.status(400).json({ error: "Invalid content" });
    return;
  }

  try {
    const wordDoc = buildDocxFromText(title, normalizeSignatureLines(content));
    const buffer = await Packer.toBuffer(wordDoc);
    const safeFilename =
      title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_").slice(0, 80) || "document";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.docx"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to build DOCX");
    res.status(500).json({ error: "Failed to build Word document" });
  }
});

router.post("/documents/download-pdf", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { title?: unknown; content?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";

  if (!title || title.length > 500) {
    res.status(400).json({ error: "Invalid title" });
    return;
  }
  if (!content || content.length > 500_000) {
    res.status(400).json({ error: "Invalid content" });
    return;
  }

  try {
    const pdfBytes = await buildPdfFromText(title, normalizeSignatureLines(content));
    const buffer = Buffer.from(pdfBytes);
    const safeFilename =
      title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_").slice(0, 80) || "document";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.pdf"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to build PDF");
    res.status(500).json({ error: "Failed to build PDF" });
  }
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;
  const [doc] = await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
