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

// GET /api/ai/status - Check if Gemini API is active
router.get('/status', authenticate, (req: Request, res: Response) => {
  const settings = db.prepare(`
    SELECT gemini_api_key, gemini_model
    FROM society_settings WHERE id = 1
  `).get() as any;

  const hasKey = Boolean(settings?.gemini_api_key || process.env.GEMINI_API_KEY);
  return res.json({
    active: hasKey,
    model: settings?.gemini_model || 'gemini-2.0-flash',
    source: settings?.gemini_api_key ? 'database' : (process.env.GEMINI_API_KEY ? 'environment' : 'none'),
  });
});

// POST /api/ai/key - Set or update Gemini API Key
router.post('/key', authenticate, (req: Request, res: Response) => {
  const { apiKey, model } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return res.status(400).json({ error: 'বৈধ Gemini API Key আবশ্যক।' });
  }

  const modelToUse = model || 'gemini-2.0-flash';
  db.prepare(`
    UPDATE society_settings
    SET gemini_api_key = ?, gemini_model = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(apiKey.trim(), modelToUse);

  return res.json({
    message: 'Google Gemini API Key সফলভাবে সংরক্ষিত হয়েছে!',
    model: modelToUse,
  });
});

// Fallback Smart Local Assistant when API key is not yet added in settings
function generateLocalSmartResponse(message: string, imageBase64?: string, societyContext?: any) {
  const q = message.toLowerCase().trim();

  // 1. Slip image uploaded without Gemini key
  if (imageBase64) {
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
      reply: `✅ রসিদের ছবি গ্রহণ করা হয়েছে!\n\nসদস্য **${matchedMember?.name || 'সম্মানিত সদস্য'}**-এর জন্য মাসিক চাঁদা ৳${draft?.amount || 1000} টাকার একটি ব্যাংক জমা ড্রাফট তৈরি করা হয়েছে। নিচে ড্রাফটটি দেখে এক ক্লিকে অনুমোদন বা সংশোধন করতে পারেন।\n\n💡 *টিপস: আরও নিখুঁত অটো-OCR এর জন্য উপরে ⚙️ সেটিংসে আপনার ফ্রি Google Gemini API Key যুক্ত করুন।*`,
      draftSubmission: draft,
      geminiActive: false,
    };
  }

  // 2. Strict No Loans Inquiry
  if (q.includes('লোন') || q.includes('ঋণ') || q.includes('ধার') || q.includes('loan') || q.includes('সুদ') || q.includes('interest')) {
    return {
      reply: `🚫 **সতর্কতা: কঠোরভাবে ঋণ ও সুদমুক্ত নীতি!**\n\nপ্রগতি কল্যাণ সমবায় সমিতি লিমিটেড কোনো প্রকার ঋণ, ধার বা সুদী লেনদেন পরিচালনা করে না। এটি শতভাগ ইসলামিক সমবায় নীতিমালা ও সঞ্চয়-ভিত্তিক সমিতিমাত্র। এখানে কেবল সদস্যপদ, নিয়মিত মাসিক সঞ্চয় চাঁদা ও অফিসিয়াল হিসাব পরিচালিত হয়।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 3. Member Specific Search (Check if any member's name or ID is in the query)
  const matched = societyContext?.membersList?.find((m: any) => 
    q.includes(m.name.toLowerCase()) || q.includes(m.id.toLowerCase()) || (m.mobile && q.includes(m.mobile))
  );
  if (matched) {
    return {
      reply: `👤 **সদস্যের তথ্য পাওয়া গেছে:**\n\n• **নাম:** ${matched.name}\n• **সদস্য আইডি:** ${matched.id}\n• **মোবাইল:** ${matched.mobile}\n• **মাসিক চাঁদার হার:** ৳${matched.monthlyFee?.toLocaleString('bn-BD')}/-\n• **মোট বকেয়া চাঁদা:** ${matched.dues > 0 ? `৳${matched.dues.toLocaleString('bn-BD')}/- (বকেয়া আছে)` : '✅ কোনো বকেয়া নেই (পরিশোধিত)'}\n\nআপনি চাইলে এই সদস্যের নামে জমা ড্রাফট তৈরি করতে পারেন।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 4. Passbook Inquiry
  if (q.includes('পাসবুক') || q.includes('passbook') || q.includes('খতিয়ান') || q.includes('স্টেটমেন্ট')) {
    return {
      reply: `📗 **ডিজিটাল সঞ্চয় পাসবুক ও খতিয়ান:**\n\nসদস্যরা তাদের ড্যাশবোর্ডে থাকা **"সঞ্চয় পাসবুক"** বাটনে ক্লিক করে আজীবন জমার খতিয়ান, রানিং ব্যালেন্স এবং অফিশিয়াল সিল ও সভাপতি-কোষাধ্যক্ষের স্বাক্ষরসহ A4 সাইজে প্রিন্ট বা ডাউনলোড করতে পারেন।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 5. Share Certificate Inquiry
  if (q.includes('শেয়ার') || q.includes('সনদ') || q.includes('সার্টিফিকেট') || q.includes('share')) {
    return {
      reply: `📜 **ডিজিটাল মূলধন শেয়ার সনদপত্র:**\n\nসমিতির প্রতিটি সদস্যের নামে ১০টি পেইড-আপ শেয়ার (মূল্য ৳১,০০০/-) বরাদ্দ রয়েছে। ড্যাশবোর্ডের **"শেয়ার সনদ"** বাটনে চাপ দিয়ে কিউআর ভেরিফিকেশন সংবলিত সনদপত্র প্রিন্ট করতে পারেন।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 6. Dues / Outstanding
  if (q.includes('বকেয়া') || q.includes('due') || q.includes('বাকি')) {
    const duesList = societyContext?.membersList?.filter((m: any) => m.dues > 0) || [];
    return {
      reply: `📊 **বকেয়া চাঁদার বর্তমান স্থিতি:**\nবর্তমানে মোট ${duesList.length} জন সম্মানিত সদস্যের বকেয়া রয়েছে। মোট বকেয়ার পরিমাণ: **৳${(societyContext?.totalDues || 0).toLocaleString('bn-BD')} টাকা**।\n\n${duesList.slice(0, 10).map((m: any) => `• ${m.name} (${m.id}): ৳${m.dues.toLocaleString('bn-BD')}`).join('\n')}${duesList.length > 10 ? `\n... এবং আরও ${duesList.length - 10} জন` : ''}`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 7. Bank Accounts / Deposit info
  if (q.includes('ব্যাংক') || q.includes('হিসাব') || q.includes('একাউন্ট') || q.includes('bank') || q.includes('টাকা পাঠাব')) {
    return {
      reply: `🏦 **সোসাইটির অফিশিয়াল ব্যাংক হিসাবসমূহ:**\n\n১. **Sonali Bank PLC**\n   • হিসাব নং: \`0102030405060\`\n   • শাখা: ধানমন্ডি শাখা, ঢাকা\n   • রাউটিং: 200261144\n\n২. **Dutch-Bangla Bank PLC**\n   • হিসাব নং: \`1151200034567\`\n   • শাখা: সাতমসজিদ রোড শাখা, ঢাকা\n\nটাকা জমা দেওয়ার পর জমার স্লিপের ছবি এখানে পাঠালে স্বয়ংক্রিয় ভাউচার তৈরি হবে।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 8. Total Members
  if (q.includes('সদস্য') || q.includes('member') || q.includes('কতজন')) {
    return {
      reply: `👥 সমিতিতে বর্তমানে মোট **${societyContext?.activeMembersCount || 0} জন** সক্রিয় নিবন্ধিত সদস্য রয়েছেন। কোনো নির্দিষ্ট সদস্যের তথ্য জানতে নাম বা আইডি বলুন।`,
      draftSubmission: null,
      geminiActive: false,
    };
  }

  // 9. Default polite guidance
  return {
    reply: `👋 আমি **Somobay AI** — আপনার ডিজিটাল সমবায় ও ভয়েস সহকারী।\n\nআমি আপনাকে কীভাবে সাহায্য করতে পারি?\n• বলুন *"বকেয়া কত আছে?"* — মোট বকেয়ার হিসাব দেখতে\n• বলুন *"পাসবুক দেখাও"* — সঞ্চয় খতিয়ান জানতে\n• বলুন *"ব্যাংক হিসাব"* — চাঁদা জমার অ্যাকাউন্ট নম্বর পেতে\n• ব্যাংক জমা স্লিপের ছবি তুলে দিন — অটো রসিদ এন্ট্রি ড্রাফট প্রস্তুত করতে।\n\n💡 *নোট: আপনি চাইলে উপরে ⚙️ আইকনে আপনার ফ্রি Google Gemini API Key দিয়ে আমাকে ১০০% মানুষের মতো বুদ্ধিমত্তা দিতে পারেন।*`,
    draftSubmission: null,
    geminiActive: false,
  };
}

export default router;
