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
  Header,
  convertInchesToTwip,
  SectionType,
} from "docx";

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
  return `You are a senior corporate attorney with 20 years of experience drafting commercial contracts. Draft a complete, attorney-quality Non-Disclosure Agreement using the following information. Output ONLY the document text — no preamble, no explanation, no markdown code blocks.

PARTIES:
- Disclosing Party / Party A: ${partyA}
- Receiving Party / Party B: ${partyB}
- Jurisdiction: ${jurisdiction}
- Effective Date: ${getCurrentDate()}
- Key Terms: ${keyTerms}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

DRAFTING RULES:
1. Use the current year (${getCurrentYear()}) — never hardcode any other year.
2. Use the actual party names ("${partyA}" and "${partyB}") throughout the entire document — never say "Party A" or "Party B" after the opening paragraph. In the opening, define a short name in parentheses (e.g., if party is "TechNova Inc." define it as ("TechNova")), then use that short name consistently.
3. Capitalize all defined terms consistently throughout.
4. Use formal legal drafting style: active voice where possible, present tense for obligations.
5. Every section must have a bold numbered heading and one or more numbered subsections.

REQUIRED SECTIONS IN THIS EXACT ORDER:
1. OPENING PARAGRAPH — recite full legal names of both parties, state of incorporation, principal place of business, and effective date. Define short names in parentheses.
2. RECITALS — two or three "WHEREAS" recitals establishing the business relationship and the purpose (the "Permitted Purpose"). Define "Confidential Information" here broadly (including written, oral, electronic, and tangible information, trade secrets, business plans, financial data, technical data, customer lists, etc., disclosed by either party in connection with the Permitted Purpose).
3. DEFINITIONS — define only terms not already defined in Recitals: Disclosing Party, Receiving Party, Representatives (limited to employees, directors, officers, attorneys, accountants, and advisors who have a need to know and are bound by confidentiality obligations no less restrictive than this Agreement).
4. OBLIGATIONS OF CONFIDENTIALITY — detailed obligations including: (a) maintain strict confidence; (b) limit disclosure solely to Representatives; (c) use Confidential Information solely for the Permitted Purpose; (d) promptly notify Disclosing Party upon discovery of any unauthorized disclosure; (e) use at least the same degree of care as each party uses to protect its own confidential information, but in no event less than reasonable care.
5. EXCLUSIONS FROM CONFIDENTIAL INFORMATION — standalone detailed section: information is excluded if it (a) is or becomes publicly available through no breach by Receiving Party; (b) was already known to Receiving Party prior to disclosure (with prior knowledge evidenced in writing); (c) is independently developed by Receiving Party without use of Confidential Information; (d) is received from a third party under no obligation of confidentiality; (e) must be disclosed pursuant to applicable law, regulation, or court order, provided Receiving Party gives prompt written notice to Disclosing Party and cooperates with any effort to obtain a protective order.
6. OWNERSHIP OF CONFIDENTIAL INFORMATION — all Confidential Information remains the sole and exclusive property of the Disclosing Party. Nothing herein grants any license, right, or interest in any Confidential Information.
7. RETURN OF CONFIDENTIAL INFORMATION — upon termination or written request, Receiving Party shall promptly (within 10 business days) return or certifiably destroy all Confidential Information and all copies, summaries, and extracts thereof, and certify such destruction in writing if requested.
8. TERM AND TERMINATION — specify duration (use the key terms to determine, or default to three (3) years), termination by either party upon thirty (30) days' written notice, and explicit survival of confidentiality obligations for five (5) years post-termination.
9. INDEMNIFICATION — breaching party shall indemnify, defend, and hold harmless the non-breaching party from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to any breach of this Agreement.
10. REMEDIES — the parties acknowledge that any breach would cause irreparable harm for which monetary damages would be inadequate compensation. Accordingly, the Disclosing Party shall be entitled to seek specific performance and injunctive or other equitable relief without the requirement of posting bond or other security and without the necessity of proving actual damages, in addition to all other remedies available at law or in equity.
11. NOTICES — all notices must be in writing; deemed delivered when: (i) personally delivered; (ii) sent by confirmed facsimile; (iii) three (3) business days after deposit in certified U.S. mail, return receipt requested, postage prepaid; or (iv) one (1) business day after deposit with a nationally recognized overnight courier. Include full address block placeholders for each party (ATTN / Name / Address / Contact No. / Email).
12. DISPUTE RESOLUTION — governing law of ${jurisdiction}; exclusive jurisdiction and venue in the state and federal courts of ${jurisdiction}; parties consent to personal jurisdiction; parties shall first attempt good-faith negotiation for 30 days before initiating litigation.
13. GENERAL — label this section "GENERAL" (not Miscellaneous). Include: (a) Amendment — only by written instrument signed by both parties; (b) Waiver — failure to enforce is not a waiver; (c) Counterparts — may be executed in counterparts, electronic signatures valid; (d) Disclaimer of Warranties — Confidential Information provided "as is," Disclosing Party makes no representations as to accuracy or completeness; (e) Assignment and Binding Effect — neither party may assign without prior written consent of the other party, except in connection with a merger or acquisition of the assigning party; (f) Entire Agreement — this Agreement constitutes the entire agreement between the parties regarding its subject matter and supersedes all prior agreements, understandings, and discussions.
14. SIGNATURE BLOCK — use the actual defined short names for each party; include lines for: By (signature), Name (printed), Title, and Date. Format clearly with space for execution.`;
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
17. SIGNATURE BLOCK — signature lines for both parties using their defined short names, with By / Name / Title / Date.
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
4. Every section has a bold numbered heading with detailed subsections.

REQUIRED SECTIONS IN THIS EXACT ORDER:
1. INTRODUCTION — who we are ("${partyA}" or "we," "us," "our"), what services this Policy covers, and that by using the Service users agree to this Policy. Include effective date and "Last Updated" date (both set to ${getCurrentDate()}).
2. INFORMATION WE COLLECT — subsections: (a) Personal Information: name, email address, billing/payment information, account credentials, and other information users provide; (b) Usage Data: IP address, browser type and version, pages visited, time spent on pages, referring URLs, device identifiers; (c) Cookies and Tracking Technologies: types of cookies used (session cookies, persistent cookies, analytics cookies), purpose of each, and that users can control cookies through browser settings.
3. HOW WE USE YOUR INFORMATION — subsections covering: (a) to provide, operate, and maintain the Service; (b) to process payments and send receipts; (c) to send transactional and administrative communications (account confirmations, security alerts); (d) to improve and personalize the Service; (e) to analyze usage and trends; (f) to comply with legal obligations; (g) if the Service uses AI (OpenAI API): clearly disclose that user-submitted contract text may be processed by OpenAI's API to generate analysis, and include a note that users should not submit documents containing sensitive personal information of third parties.
4. LEGAL BASIS FOR PROCESSING (GDPR) — for users in the EEA: (a) Consent — where you have given consent; (b) Contractual Necessity — processing necessary to provide the Service; (c) Legitimate Interests — improving the Service, preventing fraud; (d) Legal Obligation — complying with applicable law.
5. DATA SHARING AND DISCLOSURE — (a) We do NOT sell, rent, or trade personal information; (b) Service Providers: we share data with trusted third-party providers (payment processors, cloud hosting, analytics) who process data on our behalf under confidentiality obligations; (c) Legal Requirements: we may disclose data when required by law, court order, or government request; (d) Business Transfers: in connection with a merger, acquisition, or sale of assets, user data may be transferred.
6. DATA RETENTION — we retain personal information for as long as your account is active or as needed to provide Services. Usage data is retained for a shorter period except where used for security or legal compliance. We will delete or anonymize your data upon request, subject to legal retention requirements.
7. YOUR RIGHTS — subsections: (a) GDPR Rights (for EEA users): right to access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, objection to processing, right to withdraw consent; (b) CCPA Rights (for California residents): right to know what personal information is collected, right to delete, right to opt out of sale (we do not sell data), right to non-discrimination; (c) How to Exercise Rights: contact us at [contact email], we will respond within 30 days.
8. COOKIES — detailed cookie policy: (a) what cookies are; (b) types: Necessary Cookies (essential for functionality, cannot be disabled), Analytics Cookies (understand how users use the Service, can be disabled), Marketing/Preference Cookies (remember user preferences); (c) how to manage or opt out of cookies through browser settings or opt-out tools.
9. CHILDREN'S PRIVACY — the Service is not directed to children under the age of 13 (or 16 for EEA users). We do not knowingly collect personal information from children. If we discover we have collected data from a child, we will promptly delete it.
10. SECURITY — we implement commercially reasonable technical and organizational measures to protect your personal information, including encryption in transit (TLS) and at rest. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
11. THIRD-PARTY LINKS — the Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage users to review their privacy policies.
12. CHANGES TO THIS POLICY — we may update this Privacy Policy from time to time. We will notify users of material changes by email or prominent notice on the Service at least 30 days before the change takes effect. Continued use of the Service after the effective date constitutes acceptance of the updated Policy.
13. CONTACT US — for privacy-related questions or to exercise your rights, contact us at: [Company Name: ${partyA}], [Address], [Email], [Phone].`;
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
        content: "You are an expert legal document drafter. Output only the document text with no explanations, no preamble, and no markdown formatting markers like ``` or **. Use plain text formatting with ALL CAPS for section headings and numbered subsections."
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

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      run: {
        font: "Times New Roman",
        size: 28,
        bold: true,
      },
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 100 } }));
      continue;
    }

    const isNumberedSection = /^\d+\.\s+[A-Z]/.test(trimmed);
    const isAllCaps = trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const isSubSection = /^\d+\.\d+/.test(trimmed);

    if (isNumberedSection || isAllCaps) {
      children.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 120 },
          run: {
            font: "Times New Roman",
            size: 24,
            bold: true,
          },
        })
      );
    } else if (isSubSection) {
      children.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
          run: {
            font: "Times New Roman",
            size: 22,
            bold: false,
          },
        })
      );
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { after: 120 },
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
            ],
          }),
        },
        children,
      },
    ],
  });
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

router.get("/documents/:id/docx", requireAuth, async (req, res): Promise<void> => {
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

  const wordDoc = buildDocxFromText(doc.title, doc.content);
  const buffer = await Packer.toBuffer(wordDoc);
  const safeFilename = doc.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "_").slice(0, 80);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.docx"`);
  res.send(buffer);
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
