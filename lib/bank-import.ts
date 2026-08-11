import { strFromU8, unzipSync } from "fflate";

export type BankImportRecord = {
  id: string;
  date: string;
  title: string;
  originalTitle: string;
  category: string;
  amount: number;
  kind: "expense" | "income";
  source: string;
  sourceType: "bank" | "card-details" | "card-history";
  accountHint: string;
  cardLast4?: string;
  fingerprint: string;
  baseFingerprint: string;
  note?: string;
  installmentIndex?: number;
  installmentCount?: number;
};

export type BankImportResult = {
  records: BankImportRecord[];
  ignored: number;
  duplicatesInFiles: number;
  files: { name: string; format: string; found: number; ignored: number }[];
};

type CellValue = string | number | null;
type ParsedRecord = Omit<BankImportRecord, "id" | "fingerprint"> & { fileKey: string };

const russianCategoryFallback: Record<string, string> = {
  "Продукты": "Покупка продуктов",
  "Жильё": "Расходы на жильё",
  "Транспорт": "Транспортные расходы",
  "Здоровье": "Здоровье и страхование",
  "Развитие": "Обучение и сервисы",
  "Отдых": "Отдых и кафе",
  "Покупки": "Покупка",
  "Другое": "Банковская операция",
};

const merchantRules: { pattern: RegExp; title: string; category?: string }[] = [
  { pattern: /ANTHROPIC|CLAUDE/i, title: "Подписка Claude", category: "Развитие" },
  { pattern: /OPENAI|CHATGPT/i, title: "Подписка ChatGPT", category: "Развитие" },
  { pattern: /NOTION/i, title: "Подписка Notion", category: "Развитие" },
  { pattern: /Google One/i, title: "Подписка Google One", category: "Другое" },
  { pattern: /finelo/i, title: "Подписка Finelo", category: "Развитие" },
  { pattern: /aliexpress/i, title: "Покупка на AliExpress", category: "Покупки" },
  { pattern: /IHERB/i, title: "Покупка в iHerb", category: "Здоровье" },
  { pattern: /AMAZON|האמזונס/i, title: "Покупка на Amazon", category: "Покупки" },
  { pattern: /IKEA|איקאה/i, title: "Покупка в IKEA", category: "Покупки" },
  { pattern: /KSP/i, title: "Покупка в KSP", category: "Покупки" },
  { pattern: /ZARA|זארה/i, title: "Покупка в Zara", category: "Покупки" },
  { pattern: /Booking\.com|בוקינג/i, title: "Отель через Booking.com", category: "Отдых" },
  { pattern: /WOLT/i, title: "Заказ Wolt", category: "Отдых" },
  { pattern: /מקדונלדס/i, title: "McDonald’s", category: "Отдых" },
  { pattern: /ארומה/i, title: "Кафе Aroma", category: "Отдых" },
  { pattern: /מסעדת|מסעדה/i, title: "Ресторан", category: "Отдых" },
  { pattern: /מתוק מתוק/i, title: "Сладости", category: "Продукты" },
  { pattern: /שופרסל/i, title: "Супермаркет Shufersal", category: "Продукты" },
  { pattern: /סופרמרקט|סופר בשכונה/i, title: "Супермаркет", category: "Продукты" },
  { pattern: /ניצת הדובדבן/i, title: "Магазин здорового питания", category: "Продукты" },
  { pattern: /דלק|תחנת דלק/i, title: "Заправка", category: "Транспорт" },
  { pattern: /כביש 6/i, title: "Платная дорога №6", category: "Транспорт" },
  { pattern: /משרד התחבורה/i, title: "Министерство транспорта — лицензия", category: "Транспорт" },
  { pattern: /מכון הדרום/i, title: "Автосервис", category: "Транспорт" },
  { pattern: /הפול.*ביטוח|הפניקס.*רכב|ביטוח חובה/i, title: "Страхование автомобиля", category: "Транспорт" },
  { pattern: /הפניקס|ביטוח/i, title: "Страхование Phoenix", category: "Здоровье" },
  { pattern: /מכבי/i, title: "Медицинская страховка Maccabi", category: "Здоровье" },
  { pattern: /בי דראגסטורס|דראגסטורס/i, title: "Аптека BE", category: "Здоровье" },
  { pattern: /פלאפון/i, title: "Мобильная связь Pelephone", category: "Другое" },
  { pattern: /הוט מובייל/i, title: "Мобильная связь HOT Mobile", category: "Другое" },
  { pattern: /הוט נט/i, title: "Домашний интернет HOT", category: "Жильё" },
  { pattern: /CELLO/i, title: "Сервис Cello", category: "Транспорт" },
  { pattern: /דמי כרטיס/i, title: "Комиссия за банковскую карту", category: "Другое" },
  { pattern: /עמלת פעולה/i, title: "Банковская комиссия", category: "Другое" },
  { pattern: /תשלום מס/i, title: "Налог на доход по депозиту", category: "Другое" },
  { pattern: /רווח מפיקדון/i, title: "Доход по депозиту", category: "Другое" },
  { pattern: /משכורת/i, title: "Зарплата", category: "Другое" },
  { pattern: /PAYSEND/i, title: "Перевод Paysend", category: "Другое" },
  { pattern: /נאייקס/i, title: "Покупка в торговом автомате", category: "Продукты" },
  { pattern: /אייקון אילת/i, title: "Магазин Icon Eilat", category: "Покупки" },
];

function cleanText(value: unknown) {
  return String(value ?? "").replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim();
}

function normalizedKey(value: string) {
  return cleanText(value).normalize("NFKC").toLowerCase().replace(/["'׳״.,()\-_/\\]+/g, " ").replace(/\s+/g, " ").trim();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function excelDate(value: CellValue) {
  if (typeof value === "number" && value > 20000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
  }
  const text = cleanText(value);
  const match = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!match) return "";
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function numberValue(value: CellValue) {
  if (typeof value === "number") return value;
  const normalized = cleanText(value).replace(/[₪$€£,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function categoryFromText(merchant: string, providerCategory = "") {
  const text = `${merchant} ${providerCategory}`;
  const merchantRule = merchantRules.find(rule => rule.pattern.test(text));
  if (merchantRule?.category) return merchantRule.category;
  if (/מזון|סופר|מכולת|משקאות|מאפ|קונדיט|קיוסק/i.test(text)) return "Продукты";
  if (/מסעד|קפה|פנאי|בילוי|מלונ|אירוח|תיירות|תרבות/i.test(text)) return "Отдых";
  if (/רכב|תחבורה|דלק|חניה|כביש|מוסך|מונית/i.test(text)) return "Транспорт";
  if (/רפואה|בריאות|פארם|ביטוח|קופת חולים/i.test(text)) return "Здоровье";
  if (/ריהוט|בית|חשמל|אלקטרוניקה|אופנה|ביגוד|הנעלה/i.test(text)) return "Покупки";
  if (/לימוד|השכלה|ספר|קורס|תוכנה/i.test(text)) return "Развитие";
  if (/דיור|שכירות|ארנונה|חשמל|מים|גז/i.test(text)) return "Жильё";
  return "Другое";
}

function russianTitle(merchant: string, category: string) {
  const rule = merchantRules.find(item => item.pattern.test(merchant));
  if (rule) return rule.title;
  const latin = merchant.replace(/[\u0590-\u05ff]/g, "").replace(/\s+/g, " ").trim();
  if (latin.length >= Math.min(4, merchant.length / 2)) return latin;
  return russianCategoryFallback[category] || "Банковская операция";
}

function installmentInfo(note: string) {
  const match = note.match(/תשלום\s*(\d+)\s*מתוך\s*(\d+)/i);
  return match ? { index: Number(match[1]), count: Number(match[2]) } : {};
}

function headerIndex(headers: CellValue[], ...needles: string[]) {
  return headers.findIndex(value => needles.some(needle => cleanText(value).includes(needle)));
}

function cardBaseFingerprint(date: string, cardLast4: string, merchant: string, chargedAmount: number) {
  return ["card", date, cardLast4 || "unknown", normalizedKey(merchant), roundMoney(Math.abs(chargedAmount)).toFixed(2)].join(":");
}

function parseCardRows(rows: CellValue[][], fileName: string): { records: ParsedRecord[]; ignored: number; format: string } | null {
  const headerRow = rows.findIndex(row => row.some(value => cleanText(value).includes("שם בית עסק")) && row.some(value => cleanText(value).includes("תאריך")));
  if (headerRow < 0) return null;
  const headers = rows[headerRow];
  const dateIndex = headerIndex(headers, "תאריך עסקה", "תאריך");
  const merchantIndex = headerIndex(headers, "שם בית עסק");
  const transactionAmountIndex = headerIndex(headers, "סכום עסקה", "סכום בש\"ח");
  const chargedAmountIndex = headerIndex(headers, "סכום חיוב");
  const cardIndex = headerIndex(headers, "כרטיס");
  const typeIndex = headerIndex(headers, "סוג עסקה");
  const categoryIndex = headerIndex(headers, "ענף");
  const noteIndex = headerIndex(headers, "הערות");
  const detailed = chargedAmountIndex >= 0;
  const titleRow = rows.slice(0, headerRow).flat().map(cleanText).join(" ");
  const fileCard = (titleRow.match(/(?:מסתיים ב-|ויזה\s*)(\d{4})/) || fileName.match(/(\d{4})/))?.[1] || "";
  const records: ParsedRecord[] = [];
  let ignored = 0;

  rows.slice(headerRow + 1).forEach((row, rowOffset) => {
    const merchant = cleanText(row[merchantIndex]);
    const purchaseDate = excelDate(row[dateIndex]);
    const originalAmount = Math.abs(numberValue(row[transactionAmountIndex]));
    const rawCharged = detailed ? numberValue(row[chargedAmountIndex]) : numberValue(row[transactionAmountIndex]);
    const note = cleanText(row[noteIndex]);
    const type = cleanText(row[typeIndex]);
    if (!merchant || !purchaseDate || !originalAmount) return;
    const installment = installmentInfo(`${note} ${type}`);
    const chargedAmount = detailed ? Math.abs(rawCharged) : installment.count && installment.count > 1 ? roundMoney(originalAmount / installment.count) : originalAmount;
    if (!chargedAmount || installment.index === 0) { ignored += 1; return; }
    const chargeDate = purchaseDate;
    const cardLabel = cleanText(row[cardIndex]);
    const cardLast4 = (cardLabel.match(/(\d{4})/) || [])[1] || fileCard;
    const providerCategory = cleanText(row[categoryIndex]);
    const category = categoryFromText(merchant, providerCategory);
    const amountSigned = numberValue(row[transactionAmountIndex]);
    const kind = amountSigned < 0 || /זיכוי|החזר/.test(type) ? "income" : "expense";
    const baseFingerprint = cardBaseFingerprint(chargeDate, cardLast4, merchant, chargedAmount);
    records.push({
      fileKey: fileName,
      baseFingerprint,
      date: chargeDate,
      title: russianTitle(merchant, category),
      originalTitle: merchant,
      category,
      amount: roundMoney(chargedAmount),
      kind,
      source: detailed ? "Счёт кредитной карты" : "История операций по картам",
      sourceType: detailed ? "card-details" : "card-history",
      accountHint: cardLast4 ? `Visa •••• ${cardLast4}` : "Кредитная карта",
      cardLast4,
      note: [chargeDate !== purchaseDate ? `Дата покупки: ${purchaseDate}` : "", providerCategory, type, note].filter(Boolean).join(" · "),
      installmentIndex: installment.index,
      installmentCount: installment.count,
    });
    void rowOffset;
  });
  return { records, ignored, format: detailed ? "Счёт карты Excel" : "История карт Excel" };
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some(cell => cell.length)) rows.push(row); row = []; value = "";
    } else value += char;
  }
  row.push(value); if (row.some(cell => cell.length)) rows.push(row);
  return rows;
}

function parseBankRows(rows: CellValue[][], fileName: string) {
  const headerRow = rows.findIndex(row => row.some(value => cleanText(value).includes("תיאור התנועה")) && row.some(value => cleanText(value).includes("זכות/חובה")));
  if (headerRow < 0) return null;
  const headers = rows[headerRow];
  const dateIndex = headerIndex(headers, "תאריך");
  const titleIndex = headerIndex(headers, "תיאור התנועה");
  const amountIndex = headerIndex(headers, "זכות/חובה");
  const referenceIndex = headerIndex(headers, "אסמכתה");
  const records: ParsedRecord[] = [];
  let ignored = 0;
  rows.slice(headerRow + 1).forEach(row => {
    const date = excelDate(row[dateIndex]);
    const originalTitle = cleanText(row[titleIndex]);
    const signedAmount = numberValue(row[amountIndex]);
    if (!date || !originalTitle || !signedAmount) return;
    const isCardSettlement = /חיוב לכרטיס|חיוב זמני למפתח מזומן|תשלום.*כרטיס אשראי/.test(originalTitle);
    const isInternalTransfer = /חידוש פיקדון|פירעון פיקדון|הפקדת מזומן/.test(originalTitle);
    if (isCardSettlement || isInternalTransfer) { ignored += 1; return; }
    const category = categoryFromText(originalTitle);
    const reference = cleanText(row[referenceIndex]);
    const amount = roundMoney(Math.abs(signedAmount));
    const baseFingerprint = ["bank", date, reference || normalizedKey(originalTitle), amount.toFixed(2)].join(":");
    records.push({
      fileKey: fileName,
      baseFingerprint,
      date,
      title: russianTitle(originalTitle, category),
      originalTitle,
      category,
      amount,
      kind: signedAmount > 0 ? "income" : "expense",
      source: "Банковский счёт",
      sourceType: "bank",
      accountHint: "Основной счёт",
      note: reference ? `Банковская ссылка: ${reference}` : undefined,
    });
  });
  return { records, ignored, format: "Банковский CSV" };
}

function columnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/)?.[0] || "A";
  return letters.split("").reduce((result, letter) => result * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function xmlTextRuns(xml: string) {
  return [...xml.matchAll(/<(?:[\w.-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)].map(match => decodeXmlText(match[1])).join("");
}

function parseXlsxRows(buffer: ArrayBuffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const sharedXml = archive["xl/sharedStrings.xml"] ? strFromU8(archive["xl/sharedStrings.xml"]) : "";
  const shared: string[] = [];
  if (sharedXml) {
    [...sharedXml.matchAll(/<(?:[\w.-]+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?si>/g)].forEach(item => shared.push(xmlTextRuns(item[1])));
  }
  const sheetNames = Object.keys(archive).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  const allRows: CellValue[][] = [];
  sheetNames.forEach(sheetName => {
    const sheetXml = strFromU8(archive[sheetName]);
    [...sheetXml.matchAll(/<(?:[\w.-]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?row>/g)].forEach(rowMatch => {
      const row: CellValue[] = [];
      [...rowMatch[1].matchAll(/<(?:[\w.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?c>/g)].forEach(cellMatch => {
        const attributes = cellMatch[1];
        const body = cellMatch[2];
        const reference = attributes.match(/\br="([^"]+)"/)?.[1] || "A1";
        const type = attributes.match(/\bt="([^"]+)"/)?.[1] || "n";
        const raw = decodeXmlText(body.match(/<(?:[\w.-]+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] || "");
        const index = columnIndex(reference);
        let value: CellValue = raw;
        if (type === "s") value = shared[Number(raw)] ?? "";
        else if (type === "inlineStr") value = xmlTextRuns(body);
        else if (type === "b") value = raw === "1" ? 1 : 0;
        else if (raw !== "" && Number.isFinite(Number(raw))) value = Number(raw);
        row[index] = value;
      });
      allRows.push(row.map(value => value ?? null));
    });
  });
  return allRows;
}

async function rowsFromFile(file: File) {
  const buffer = await file.arrayBuffer();
  if (/\.xlsx$/i.test(file.name)) return parseXlsxRows(buffer);
  const bytes = new Uint8Array(buffer);
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe;
  const text = new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(bytes).replace(/^\uFEFF/, "");
  const delimiter = text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",";
  return parseDelimited(text, delimiter);
}

export async function parseBankFiles(files: File[]): Promise<BankImportResult> {
  const parsed: ParsedRecord[] = [];
  const summaries: BankImportResult["files"] = [];
  let ignored = 0;
  for (const file of files) {
    const rows = await rowsFromFile(file);
    const result = parseBankRows(rows, file.name) || parseCardRows(rows, file.name);
    if (!result) { summaries.push({ name: file.name, format: "Неизвестный формат", found: 0, ignored: rows.length }); ignored += rows.length; continue; }
    parsed.push(...result.records);
    ignored += result.ignored;
    summaries.push({ name: file.name, format: result.format, found: result.records.length, ignored: result.ignored });
  }

  const occurrence = new Map<string, number>();
  const withFingerprints = parsed.map((record, index): BankImportRecord => {
    const counterKey = `${record.fileKey}:${record.baseFingerprint}`;
    const rowOccurrence = (occurrence.get(counterKey) || 0) + 1;
    occurrence.set(counterKey, rowOccurrence);
    return { ...record, id: `${index}-${rowOccurrence}`, fingerprint: `${record.baseFingerprint}:row${rowOccurrence}` };
  });
  const priority = { "card-details": 3, "card-history": 2, bank: 1 } as const;
  const unique = new Map<string, BankImportRecord>();
  withFingerprints.forEach(record => {
    const current = unique.get(record.fingerprint);
    if (!current || priority[record.sourceType] > priority[current.sourceType]) unique.set(record.fingerprint, record);
  });
  return { records: [...unique.values()].sort((a, b) => b.date.localeCompare(a.date)), ignored, duplicatesInFiles: withFingerprints.length - unique.size, files: summaries };
}
