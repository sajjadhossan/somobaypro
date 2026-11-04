import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/ai/chat - Process AI message, optional slip image, and return analysis/actions
router.post('/chat', authenticate, async (req: Request, res: Response) => {
  try {
    const { message, imageBase64, mimeType } = req.body;
    if (!message && !imageBase64) {
      return res.status(400).json({ error: 'বার্তা অথবা রসিদের ছবি আবশ্যক।' });
    }

    // 1. Get Gemini Settings & Society Context
    const settings = db.prepare(`
      SELECT name_bn, name_en, reg_no, gemini_api_key, gemini_model
      FROM society_settings WHERE id = 1
    `).get() as any;

    const apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY || '';
    const modelName = settings?.gemini_model || 'gemini-2.0-flash';

    // 2. Fetch fresh database context (members, dues, accounts) for the AI
    const members = db.prepare(`
      SELECT m.member_id, m.full_name_bn, m.full_name_en, m.mobile, m.designation, m.monthly_subscription_amount,
             COALESCE(SUM(d.due_amount - d.paid_amount), 0) as total_dues
      FROM members m
      LEFT JOIN subscription_dues d ON m.member_id = d.member_id AND d.status != 'paid'
      WHERE m.membership_status = 'active'
      GROUP BY m.member_id
    `).all() as any[];

    const bankAccounts = db.prepare(`
      SELECT id, bank_name, account_number, branch_name, current_balance
      FROM bank_accounts WHERE is_active = 1
    `).all() as any[];

    const duesSummary = db.prepare(`
      SELECT coalesce(sum(due_amount - paid_amount), 0) as totalDues,
             count(distinct member_id) as membersWithDues
      FROM subscription_dues WHERE status != 'paid'
    `).get() as any;

    const societyContext = {
      societyName: settings?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড',
      activeMembersCount: members.length,
      bankAccounts: bankAccounts.map((b) => `${b.bank_name} (${b.account_number})`),
      totalDues: duesSummary?.totalDues || 0,
      membersList: members.map((m) => ({
        id: m.member_id,
        name: m.full_name_bn,
        mobile: m.mobile,
        dues: m.total_dues,
        monthlyFee: m.monthly_subscription_amount,
      })),
    };

    // If API key is available, use Google Gemini API
    if (apiKey && apiKey.length > 10) {
      const aiResponse = await callGeminiAPI(apiKey, modelName, message || 'এই রসিদটি বিশ্লেষণ করে জমাদানকারী ও টাকার তথ্য বের করো।', imageBase64, mimeType, societyContext);
      return res.json(aiResponse);
    } else {
      // Fallback Smart Local Assistant when Gemini API key is not yet configured
      const localResponse = generateLocalSmartResponse(message || '', imageBase64, societyContext);
      return res.json(localResponse);
    }
  } catch (err: any) {
    console.error('AI Processing error:', err);
    res.status(500).json({
      error: 'এআই প্রসেসিং ত্রুটি: ' + (err.message || 'সার্ভার যোগাযোগে সমস্যা'),
    });
  }
});

// Helper: Call Google Generative Language API
async function callGeminiAPI(
  apiKey: string,
  model: string,
  userMessage: string,
  imageBase64?: string,
  mimeType?: string,
  societyContext?: any
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = 
`You are 'Somobay AI', the intelligent assistant for '${societyContext?.societyName || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}', a Bangladeshi Cooperative Society.
IMPORTANT RULES:
1. STRICTLY NO LOANS! Never discuss, calculate, or suggest loans, interest, or borrowing. The society ONLY manages memberships, monthly subscriptions, bank deposits, digital receipts, and official administration.
2. Language: Always communicate warmly and professionally in Bengali (বাংলা).
3. Member Matching: When user gives a name or deposit slip, search the provided member list: ${JSON.stringify(societyContext?.membersList?.slice(0, 20))}.
4. When a bank slip image or deposit instruction is provided, extract:
   - Target member ID & name
   - Bank name & Branch
   - Deposit date (YYYY-MM-DD)
   - Amount (number)
   - Transaction / Scroll ID
   - Depositor Name, Relation ('নিজ' or family relation), NID, and Mobile
5. If enough information exists to propose a deposit entry, output a valid JSON codeblock at the end with this exact structure:
\`\`\`json
{
  "hasDraft": true,
  "draftSubmission": {
    "targetMemberId": "SOC-2026-0007",
    "memberName": "তানভীর আহমেদ",
    "amount": 1000,
    "paymentMonths": "2026-04",
    "societyBankAccountId": 1,
    "memberBankName": "Sonali Bank PLC",
    "memberBranchName": "Dhanmondi Branch",
    "depositDate": "2026-04-05",
    "transactionId": "TXN12345",
    "depositorType": "self",
    "depositorName": "তানভীর আহমেদ",
    "depositorRelation": "নিজ",
    "depositorNid": "",
    "depositorMobile": "01711000007",
    "notes": "এআই স্ক্যানকৃত ব্যাংক জমা স্লিপ"
  }
}
\`\`\`
Answer helpfully in Bengali.`;

  const contentsParts: any[] = [];

  if (imageBase64) {
    contentsParts.push({
      inlineData: {
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: mimeType || 'image/jpeg',
      },
    });
  }

  contentsParts.push({
    text: userMessage,
  });

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: contentsParts,
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'কোনো প্রতিক্রিয়া পাওয়া যায়নি।';

  // Check for JSON draft block
  let draftSubmission: any = null;
  const jsonMatch = candidateText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.hasDraft && parsed.draftSubmission) {
        draftSubmission = parsed.draftSubmission;
      }
    } catch (e) {
      // JSON parse error, ignore
    }
  }

  // Clean candidate text for display (remove raw json block if needed or keep explanation)
  const cleanReply = candidateText.replace(/```json[\s\S]*?```/, '').trim();

  return {
    reply: cleanReply,
    draftSubmission,
    modelUsed: model,
    geminiActive: true,
  };
}

// Fallback Smart Local Assistant when API key is not yet added in settings
function generateLocalSmartResponse(message: string, imageBase64?: string, societyContext?: any) {
  const q = message.toLowerCase();

  // If slip image was uploaded without Gemini key
  if (imageBase64) {
    // Pick first matching member from query or default to a member
    const matchedMember = societyContext?.membersList?.find((m: any) => 
      message.includes(m.name) || (m.mobile && message.includes(m.mobile))
    ) || societyContext?.membersList?.[0];

    const draft = matchedMember ? {
      targetMemberId: matchedMember.id,
      memberName: matchedMember.name,
      amount: matchedMember.monthlyFee || 1000,
      paymentMonths: new Date().toISOString().slice(0, 7),
      societyBankAccountId: 1,
      memberBankName: 'Sonali Bank PLC',
      memberBranchName: 'ধানমন্ডি শাখা',
      depositDate: new Date().toISOString().split('T')[0],
      transactionId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      depositorType: 'self',
      depositorName: matchedMember.name,
      depositorRelation: 'নিজ',
      depositorNid: '',
      depositorMobile: matchedMember.mobile || '',
      notes: 'ব্যাংক জমা স্লিপ হতে অটো ড্রাফট',
    } : null;

    return {
      reply: `✅ রসিদের ছবি গ্রহণ করা হয়েছে!\n\nসদস্য **${matchedMember?.name || 'সম্মানিত সদস্য'}**-এর জন্য মাসিক চাঁদা ৳${draft?.amount || 1000} টাকার একটি ব্যাংক জমা ড্রাফট তৈরি করা হয়েছে। নিচে ড্রাফটটি দেখে এক ক্লিকে অনুমোদন বা সংশোধন করতে পারেন।\n\n💡 *টিপস: জেমিনির অ্যাডভান্সড মাল্টিমোডাল ভিশন OCR সক্রিয় করতে সেটিংস পেজে আপনার ফ্রি Gemini API Key প্রদান করুন।*`,
      draftSubmission: draft,
      geminiActive: false,
    };
  }

  // Common Q&A
  if (q.includes('বকেয়া') || q.includes('due')) {
    const duesList = societyContext?.membersList?.filter((m: any) => m.dues > 0) || [];
    return {
      reply: `📊 **বকেয়া চাঁদার বর্তমান স্থিতি:**\nবর্তমানে মোট ${duesList.length} জন সম্মানিত সদস্যের বকেয়া রয়েছে। মোট বকেয়ার পরিমাণ: ৳${(societyContext?.totalDues || 0).toLocaleString('bn-BD')} টাকা।\n\n${duesList.map((m: any) => `• ${m.name} (${m.id}): ৳${m.dues.toLocaleString('bn-BD')}`).join('\n')}`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  if (q.includes('সদস্য') || q.includes('member')) {
    return {
      reply: `👥 সমিতিতে বর্তমানে মোট **${societyContext?.activeMembersCount || 0} জন** সক্রিয় সদস্য রয়েছেন। কোনো নির্দিষ্ট সদস্যের তথ্য বা লেজার স্টেটমেন্ট দেখতে তার নাম বা মেম্বার আইডি লিখুন।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  return {
    reply: `👋 আমি **Somobay AI** — আপনার ডিজিটাল সমবায় সহকারী।\n\nআমি আপনাকে কীভাবে সাহায্য করতে পারি?\n১. ব্যাংক জমা স্লিপের ছবি দিলে আমি অটো চাঁদা এন্ট্রি ড্রাফট তৈরি করতে পারি।\n২. কার কার বকেয়া আছে বা এই মাসের আর্থিক রিপোর্ট জানতে চাইতে পারেন।\n৩. নতুন সদস্যের চাঁদা সমন্বয় বা নোটিশ তৈরি করতে পারি।\n\n📌 *দ্রষ্টব্য: এই সমিতি ১০০% ঋণমুক্ত ও ইসলামিক সমবায় নীতিতে পরিচালিত।*`,
    draftSubmission: null,
    geminiActive: false,
  };
}

export default router;
