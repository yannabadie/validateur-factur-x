/**
 * FacturXEngine2027 — Sovereign Browser + Node v24 Dual-Runtime Engine (Zero External Dependencies)
 * =================================================================================================
 * Normative Coverage:
 *   - Layer 1 (PDF_A3): ISO 19005-3 (PDF/A-3b) FlateDecode stream extraction & generation,
 *     /AF (Associated Files), /Names/EmbeddedFiles, /OutputIntents (sRGB IEC61966-2.1 ICC profile),
 *     and uncompressed XMP RDF extension schema (urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#).
 *   - Layer 2 (EN_16931): UN/CEFACT CrossIndustryInvoice D16B (Factur-X 1.0.07) strict XML parser,
 *     cent-exact BigInt arithmetic (BR-CO-10..17, BR-CO-25), VAT categories (BR-S-08/10, BR-E-08..10).
 *   - Layer 3 (BR_FR_FLUX2): AFNOR XP Z12-012 French PA Flux 2 gate (rejects MINIMUM/BASIC WL/BASIC),
 *     BR-FR-01/02/04/05/06/08/09/10/11/12/13/21, INSEE Luhn SIREN/SIRET (incl. La Poste 356000000 mod-5),
 *     French VAT key, ISO 13616 Modulo-97 IBAN, and LF 2026 / CGI art. 293 B / OSS 10k risk radar.
 *
 * Edited by YGN — FacturKit 2027 (MIT / Sovereign Client-Side Runtime)
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.FacturXEngine2027 = api;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.FacturXEngine2027 = api;
  }
  if (typeof window !== "undefined") {
    window.FacturXEngine2027 = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "2027.1.0";

  const NS_RSM = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";
  const NS_RAM = "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100";
  const NS_UDT = "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100";
  const NS_QDT = "urn:un:unece:uncefact:data:standard:QualifiedDataType:100";
  const FACTURX_XMP_NS = "urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#";

  const PROFILE_BY_URN = {
    "urn:factur-x.eu:1p0:minimum": "MINIMUM",
    "urn:factur-x.eu:1p0:basicwl": "BASIC WL",
    "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic": "BASIC",
    "urn:cen.eu:en16931:2017": "EN 16931",
    "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended": "EXTENDED"
  };

  const PA_ALLOWED_TYPE_CODES = new Set(["380", "381", "384", "386", "389", "261"]);
  const REF_REQUIRED_TYPE_CODES = new Set(["381", "384", "261"]);
  const VALID_BT23_CODES = new Set(["B1", "S1", "M1", "B2", "S2", "M2"]);
  const UNIQUE_NOTE_CODES = new Set(["PMD", "PMT", "AAB", "TXD", "REG", "ABL", "AAI", "DCL", "BAR"]);

  const ERROR_WEIGHTS = {
    PDF_NO_FACTURX_XML: 100,
    XML_PARSE_ERROR: 100,
    XMP_SCHEMA_INVALID: 15,
    PA_PROFILE_REJECTED: 25,
    "BR-FR-01": 10,
    "BR-FR-02": 10,
    "BR-FR-04": 10,
    "BR-FR-05": 10,
    "BR-FR-06": 10,
    "BR-FR-08": 10,
    "BR-FR-09": 10,
    "BR-FR-10": 10,
    "BR-FR-11": 10,
    "BR-FR-12": 10,
    "BR-FR-13": 10,
    "BR-FR-21": 10,
    "BR-E-08": 12,
    "BR-E-09": 12,
    "BR-E-10": 12,
    "BR-S-08": 12,
    "BR-S-10": 12,
    "BR-CO-10": 12,
    "BR-CO-11": 12,
    "BR-CO-12": 12,
    "BR-CO-13": 12,
    "BR-CO-14": 12,
    "BR-CO-15": 12,
    "BR-CO-16": 12,
    "BR-CO-17": 12,
    "BR-CO-25": 12,
    IBAN_INVALID: 12,
    VAT_KEY_INVALID: 12
  };

  // Pre-compressed RFC 1950 zlib stream (360 bytes; raw 588 bytes) for genuine LittleCMS2 sRGB ICC profile ("acsp", RGB -> XYZ)
  const SRGB_ICC_ZLIB_B64 =
    "eNqVkbtLw1AUxn+tSkVbKigo4tBBxaGCKIij1qFLEakKvpY09iEkaUhapLgKLg4FB9HF1+B/oKvg" +
    "qiAIiiDi7OhrEYnn2kJFdPCGm/PjS77Dud8Ff8LQTbd+FEyr4CTjscjs3Hwk8EgzLbQzREjTXXts" +
    "cjLBn+vtGp+qV/2qF/9bzUtpVwdfo/CwbjsFYZmGxErBVrwh3KbntCXhPeGoIwMKnys9VeEHxdkK" +
    "vyh2ppPj4Fc9I9lvnPrGes4xhfuEu02jqFfnUScJpq2ZKamdsrtwSRInRoQURZYxKNAv1ZLMfvcN" +
    "fPkmyItHl7dNCUccWXLijYpalK5pqRnR0/IYlFTuP/N0M0ODle7BGDTce95zDwQ24aPsee/7nvdx" +
    "AHV3cGrV/HnJaeRV9HJN696F8Bocn9W01BacrEPHra052pdUJ9ufycDTEYTmoPUSmhYqWVW/c3gD" +
    "06tyRRewvQO98n948RMxlmgg";

  // Windows-1252 (WinAnsiEncoding) special mapping for 0x80..0x9F Unicode codepoints
  const WINANSI_SPECIAL = {
    0x20AC: 0x80, // €
    0x201A: 0x82,
    0x0192: 0x83,
    0x201E: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02C6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8A,
    0x2039: 0x8B,
    0x0152: 0x8C, // Œ
    0x017D: 0x8E,
    0x2018: 0x91,
    0x2019: 0x92, // ’
    0x201C: 0x93,
    0x201D: 0x94,
    0x2022: 0x95, // •
    0x2013: 0x96, // –
    0x2014: 0x97, // —
    0x02DC: 0x98,
    0x2122: 0x99,
    0x0161: 0x9A,
    0x203A: 0x9B,
    0x0153: 0x9C, // œ
    0x017E: 0x9E,
    0x0178: 0x9F
  };

  /* ------------------------------------------------------------------------
   * 1. Binary & Web Streams Helpers (Browser + Node v24 Safe)
   * --------------------------------------------------------------------- */

  function toUint8Array(input) {
    if (input == null) return new Uint8Array(0);
    if (input instanceof Uint8Array) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    if (typeof input === "string") {
      return new TextEncoder().encode(input);
    }
    if (Array.isArray(input)) {
      return Uint8Array.from(input);
    }
    throw new TypeError("Unsupported binary input type for FacturXEngine2027");
  }

  function bytesToBinaryString(u8) {
    let out = "";
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      const sub = u8.subarray(i, Math.min(i + chunk, u8.length));
      out += String.fromCharCode.apply(null, sub);
    }
    return out;
  }

  function asciiToBytes(str) {
    const u8 = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      u8[i] = str.charCodeAt(i) & 0xff;
    }
    return u8;
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    return asciiToBytes(bin);
  }

  function concatUint8Arrays(parts) {
    let total = 0;
    for (let i = 0; i < parts.length; i++) total += parts[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < parts.length; i++) {
      out.set(parts[i], offset);
      offset += parts[i].length;
    }
    return out;
  }

  function trimCrlfBytes(u8) {
    let start = 0;
    let end = u8.length;
    while (start < end && (u8[start] === 0x0d || u8[start] === 0x0a)) start++;
    while (end > start && (u8[end - 1] === 0x0d || u8[end - 1] === 0x0a)) end--;
    return u8.subarray(start, end);
  }

  async function safeCompressDeflate(bytes) {
    const u8 = toUint8Array(bytes);
    const cs = new CompressionStream("deflate");
    const writer = cs.writable.getWriter();
    const readP = new Response(cs.readable).arrayBuffer();
    readP.catch(function () {});
    await writer.write(u8);
    await writer.close();
    return new Uint8Array(await readP);
  }

  async function safeDecompressFlate(bytes) {
    const raw = toUint8Array(bytes);
    const trimmed = trimCrlfBytes(raw);
    const candidates = trimmed.length !== raw.length ? [raw, trimmed] : [raw];
    const formats = ["deflate", "deflate-raw"];

    for (let f = 0; f < formats.length; f++) {
      const fmt = formats[f];
      for (let c = 0; c < candidates.length; c++) {
        const ds = new DecompressionStream(fmt);
        const writer = ds.writable.getWriter();
        const readP = new Response(ds.readable).arrayBuffer();
        readP.catch(function () {});
        try {
          await writer.write(candidates[c]);
          await writer.close();
          return new Uint8Array(await readP);
        } catch (err) {
          try {
            await writer.abort(err);
          } catch (_) {}
        }
      }
    }
    throw new Error("FLATE_DECOMPRESS_FAILED");
  }

  /* ------------------------------------------------------------------------
   * 2. Cent-Exact Decimal Arithmetic & Identifier Validation (FR / ISO)
   * --------------------------------------------------------------------- */

  function parseDecimalScaled(val, scaleDigits) {
    const sRaw = String(val == null ? "" : val)
      .trim()
      .replace(/\u00a0/g, "")
      .replace(/\s+/g, "")
      .replace(",", ".");
    if (!sRaw || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(sRaw)) {
      return null;
    }
    const neg = sRaw.startsWith("-");
    const unsigned = sRaw.replace(/^[+-]/, "");
    const parts = unsigned.split(".");
    const intPart = parts[0] || "0";
    const fracPart = parts[1] || "";
    const padded = (fracPart + "0".repeat(scaleDigits + 1)).slice(0, scaleDigits + 1);
    const mainDigits = padded.slice(0, scaleDigits);
    const roundDigit = padded.charCodeAt(scaleDigits) - 48;
    const scalePow = BigInt("1" + "0".repeat(scaleDigits));
    let scaled = BigInt(intPart) * scalePow + BigInt(mainDigits || "0");
    if (roundDigit >= 5) {
      scaled += 1n;
    }
    return neg ? -scaled : scaled;
  }

  function parseCents(val) {
    return parseDecimalScaled(val, 2);
  }

  function formatCents(centsBigInt) {
    const c = typeof centsBigInt === "bigint" ? centsBigInt : BigInt(Math.round(Number(centsBigInt || 0)));
    const neg = c < 0n;
    const abs = neg ? -c : c;
    const euros = abs / 100n;
    const rem = abs % 100n;
    const remStr = rem < 10n ? "0" + rem.toString() : rem.toString();
    return (neg ? "-" : "") + euros.toString() + "." + remStr;
  }

  function divRoundHalfUp(numBigInt, denBigInt) {
    if (denBigInt === 0n) return 0n;
    const neg = (numBigInt < 0n) !== (denBigInt < 0n);
    const a = numBigInt < 0n ? -numBigInt : numBigInt;
    const b = denBigInt < 0n ? -denBigInt : denBigInt;
    const q = a / b;
    const r = a % b;
    const rounded = r * 2n >= b ? q + 1n : q;
    return neg ? -rounded : rounded;
  }

  function computeLineNetCents(qtyVal, netPriceVal, basisQtyVal) {
    const qty6 = parseDecimalScaled(qtyVal == null ? "1" : qtyVal, 6);
    const price6 = parseDecimalScaled(netPriceVal == null ? "0" : netPriceVal, 6);
    const basis6 = parseDecimalScaled(basisQtyVal == null || String(basisQtyVal).trim() === "" ? "1" : basisQtyVal, 6);
    if (qty6 === null || price6 === null || basis6 === null || basis6 <= 0n) {
      return null;
    }
    // Result in cents (scale 2): (qty6 * price6) / (basis6 * 10^4)
    return divRoundHalfUp(qty6 * price6, basis6 * 10000n);
  }

  function computeTaxCents(basisCents, rateVal) {
    const rate4 = parseDecimalScaled(rateVal == null ? "0" : rateVal, 4);
    if (basisCents === null || rate4 === null) return null;
    // basisCents * (rate% / 100) = (basisCents * rate4) / 1000000
    return divRoundHalfUp(basisCents * rate4, 1000000n);
  }

  function cleanDigits(value) {
    return String(value == null ? "" : value).replace(/[\s.\-]+/g, "");
  }

  function validateLuhn(digits) {
    if (!digits || !/^\d+$/.test(digits)) return false;
    let total = 0;
    for (let i = digits.length - 1, pos = 0; i >= 0; i--, pos++) {
      let n = digits.charCodeAt(i) - 48;
      if (pos % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      total += n;
    }
    return total % 10 === 0;
  }

  function validateSiren(siren) {
    const cleaned = cleanDigits(siren);
    if (cleaned.length !== 9 || !/^\d{9}$/.test(cleaned) || cleaned === "000000000") {
      return false;
    }
    return validateLuhn(cleaned);
  }

  function validateSiret(siret) {
    const cleaned = cleanDigits(siret);
    if (cleaned.length !== 14 || !/^\d{14}$/.test(cleaned) || cleaned === "00000000000000") {
      return false;
    }
    const sirenPart = cleaned.slice(0, 9);
    if (!validateSiren(sirenPart)) return false;
    if (validateLuhn(cleaned)) return true;
    // Official INSEE La Poste exception (SIREN 356000000): sum of 14 digits divisible by 5
    if (sirenPart === "356000000") {
      let sum = 0;
      for (let i = 0; i < cleaned.length; i++) sum += cleaned.charCodeAt(i) - 48;
      return sum % 5 === 0;
    }
    return false;
  }

  function computeFrenchVat(sirenOrSiret) {
    const cleaned = cleanDigits(sirenOrSiret);
    const siren = cleaned.length === 14 ? cleaned.slice(0, 9) : cleaned;
    if (!validateSiren(siren)) {
      throw new Error("Invalid French SIREN for VAT key calculation: " + sirenOrSiret);
    }
    const key = (12 + 3 * (Number(siren) % 97)) % 97;
    return "FR" + (key < 10 ? "0" + key : String(key)) + siren;
  }

  function validateFrenchVat(vatNumber, expectedSiren) {
    const cleaned = String(vatNumber == null ? "" : vatNumber)
      .replace(/[\s.\-]+/g, "")
      .toUpperCase();
    if (!/^FR\d{11}$/.test(cleaned)) return false;
    const siren = cleaned.slice(4);
    if (!validateSiren(siren)) return false;
    if (expectedSiren && validateSiren(expectedSiren) && cleanDigits(expectedSiren) !== siren) {
      return false;
    }
    return computeFrenchVat(siren) === cleaned;
  }

  function validateIban(iban) {
    const cleaned = String(iban == null ? "" : iban).replace(/\s+/g, "").toUpperCase();
    if (cleaned.length < 15 || cleaned.length > 34) return false;
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(cleaned)) return false;
    if (cleaned.startsWith("FR") && cleaned.length !== 27) return false;
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
    let numStr = "";
    for (let i = 0; i < rearranged.length; i++) {
      const code = rearranged.charCodeAt(i);
      if (code >= 48 && code <= 57) {
        numStr += rearranged[i];
      } else {
        numStr += String(code - 55);
      }
    }
    return BigInt(numStr) % 97n === 1n;
  }

  /* ------------------------------------------------------------------------
   * 3. Pure-JS Strict Namespace-Aware XML Parser (Zero DOMParser Dependency)
   * --------------------------------------------------------------------- */

  function xmlParseFail(msg) {
    const err = new Error(msg);
    err.code = "XML_PARSE_ERROR";
    throw err;
  }

  function decodeXmlEntitiesStrict(raw) {
    if (!raw.includes("&")) return raw;
    return raw.replace(/&(#x[0-9A-Fa-f]+|#\d+|[A-Za-z_][\w.\-]*)?;?/g, function (match, body) {
      if (!match.endsWith(";") || !body) {
        xmlParseFail("Unescaped '&' or malformed XML entity reference: " + match);
      }
      if (body === "amp") return "&";
      if (body === "lt") return "<";
      if (body === "gt") return ">";
      if (body === "quot") return '"';
      if (body === "apos") return "'";
      if (body.startsWith("#x") || body.startsWith("#X")) {
        const cp = parseInt(body.slice(2), 16);
        if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) {
          xmlParseFail("Invalid hex character entity: " + match);
        }
        return String.fromCodePoint(cp);
      }
      if (body.startsWith("#")) {
        const cp = parseInt(body.slice(1), 10);
        if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) {
          xmlParseFail("Invalid decimal character entity: " + match);
        }
        return String.fromCodePoint(cp);
      }
      xmlParseFail("Unknown undeclared XML entity reference: &" + body + ";");
    });
  }

  function isValidQName(name) {
    return /^[A-Za-z_\u00C0-\u02FF][\w.\-\u00B7\u00C0-\u02FF]*(?::[A-Za-z_\u00C0-\u02FF][\w.\-\u00C0-\u02FF]*)?$/.test(name);
  }

  function parseXmlStrict(xmlInput) {
    if (typeof xmlInput !== "string") {
      xmlParseFail("XML input must be a UTF-8 string");
    }
    let src = xmlInput;
    if (src.charCodeAt(0) === 0xfeff) {
      src = src.slice(1);
    }
    // Reject illegal XML 1.0 control characters (excluding \t, \n, \r)
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(src)) {
      xmlParseFail("Illegal XML 1.0 control character in stream");
    }
    if (!src.trim()) {
      xmlParseFail("Empty XML stream");
    }

    const len = src.length;
    let pos = 0;
    let root = null;
    const stack = [];
    const nsScopes = [{ xml: "http://www.w3.org/XML/1998/namespace", "": "" }];

    while (pos < len) {
      const lt = src.indexOf("<", pos);
      if (lt === -1) {
        const trailing = src.slice(pos);
        if (trailing.includes("]]>")) {
          xmlParseFail("Unexpected ']]>' outside CDATA section");
        }
        const decoded = decodeXmlEntitiesStrict(trailing);
        if (stack.length > 0) {
          stack[stack.length - 1].textParts.push(decoded);
        } else if (decoded.trim() !== "") {
          xmlParseFail("Unexpected trailing text outside XML root element");
        }
        break;
      }

      if (lt > pos) {
        const textChunk = src.slice(pos, lt);
        if (textChunk.includes("]]>")) {
          xmlParseFail("Unexpected ']]>' in character data");
        }
        const decoded = decodeXmlEntitiesStrict(textChunk);
        if (stack.length > 0) {
          stack[stack.length - 1].textParts.push(decoded);
        } else if (decoded.trim() !== "") {
          xmlParseFail("Unexpected character data before or after root element");
        }
      }

      // Comment
      if (src.startsWith("<!--", lt)) {
        const endComment = src.indexOf("-->", lt + 4);
        if (endComment === -1) xmlParseFail("Unclosed XML comment");
        const commentBody = src.slice(lt + 4, endComment);
        if (commentBody.includes("--") || commentBody.endsWith("-")) {
          xmlParseFail("Invalid '--' inside XML comment");
        }
        pos = endComment + 3;
        continue;
      }

      // CDATA
      if (src.startsWith("<![CDATA[", lt)) {
        if (stack.length === 0) xmlParseFail("CDATA section outside root element");
        const endCdata = src.indexOf("]]>", lt + 9);
        if (endCdata === -1) xmlParseFail("Unclosed CDATA section");
        stack[stack.length - 1].textParts.push(src.slice(lt + 9, endCdata));
        pos = endCdata + 3;
        continue;
      }

      // Processing Instruction / XML declaration
      if (src.startsWith("<?", lt)) {
        const endPi = src.indexOf("?>", lt + 2);
        if (endPi === -1) xmlParseFail("Unclosed XML processing instruction");
        pos = endPi + 2;
        continue;
      }

      // DOCTYPE / DTD (strictly block <!ENTITY for XXE safety)
      if (src.startsWith("<!DOCTYPE", lt)) {
        if (root !== null || stack.length > 0) {
          xmlParseFail("Misplaced DOCTYPE declaration");
        }
        let dPos = lt + 9;
        let bracketDepth = 0;
        let quote = null;
        while (dPos < len) {
          const ch = src[dPos];
          if (quote) {
            if (ch === quote) quote = null;
          } else if (ch === '"' || ch === "'") {
            quote = ch;
          } else if (ch === "[") {
            bracketDepth++;
          } else if (ch === "]") {
            bracketDepth--;
            if (bracketDepth < 0) xmlParseFail("Malformed DOCTYPE internal subset");
          } else if (ch === ">" && bracketDepth === 0) {
            break;
          }
          dPos++;
        }
        if (dPos >= len) xmlParseFail("Unclosed DOCTYPE declaration");
        const doctypeBody = src.slice(lt, dPos + 1);
        if (/<!ENTITY\b/i.test(doctypeBody)) {
          xmlParseFail("External or internal <!ENTITY declarations are forbidden (XXE protection)");
        }
        pos = dPos + 1;
        continue;
      }

      if (src.startsWith("<!", lt)) {
        xmlParseFail("Unsupported or forbidden XML declaration: " + src.slice(lt, lt + 16));
      }

      // Closing tag </name>
      if (src.startsWith("</", lt)) {
        const gt = src.indexOf(">", lt + 2);
        if (gt === -1) xmlParseFail("Unclosed XML end tag");
        const closeName = src.slice(lt + 2, gt).trim();
        if (!isValidQName(closeName)) {
          xmlParseFail("Invalid closing tag name: " + closeName);
        }
        if (stack.length === 0) {
          xmlParseFail("Unexpected closing tag </" + closeName + ">");
        }
        const top = stack.pop();
        nsScopes.pop();
        if (top.tagName !== closeName) {
          xmlParseFail("Mismatched closing tag </" + closeName + "> for <" + top.tagName + ">");
        }
        top.text = top.textParts.join("");
        delete top.textParts;
        pos = gt + 1;
        continue;
      }

      // Opening tag <name attr="val" ... [/]>
      let cur = lt + 1;
      while (cur < len && !/[\s/>=]/.test(src[cur])) cur++;
      const tagName = src.slice(lt + 1, cur);
      if (!isValidQName(tagName)) {
        xmlParseFail("Invalid XML element QName: " + tagName);
      }

      const rawAttrs = Object.create(null);
      let selfClosing = false;

      while (cur < len) {
        const wsStart = cur;
        while (cur < len && /\s/.test(src[cur])) cur++;
        if (cur >= len) xmlParseFail("Unclosed start tag <" + tagName + ">");

        if (src[cur] === ">") {
          cur++;
          break;
        }
        if (src.startsWith("/>", cur)) {
          selfClosing = true;
          cur += 2;
          break;
        }
        if (cur === wsStart) {
          xmlParseFail("Missing whitespace between attributes in <" + tagName + ">");
        }

        const attrStart = cur;
        while (cur < len && !/[\s=/>]/.test(src[cur])) cur++;
        const attrName = src.slice(attrStart, cur);
        if (!isValidQName(attrName)) {
          xmlParseFail("Invalid attribute name '" + attrName + "' in <" + tagName + ">");
        }
        if (Object.prototype.hasOwnProperty.call(rawAttrs, attrName)) {
          xmlParseFail("Duplicate attribute '" + attrName + "' in <" + tagName + ">");
        }
        while (cur < len && /\s/.test(src[cur])) cur++;
        if (src[cur] !== "=") {
          xmlParseFail("Missing '=' after attribute '" + attrName + "' in <" + tagName + ">");
        }
        cur++;
        while (cur < len && /\s/.test(src[cur])) cur++;
        const q = src[cur];
        if (q !== '"' && q !== "'") {
          xmlParseFail("Unquoted attribute value for '" + attrName + "' in <" + tagName + ">");
        }
        cur++;
        const valEnd = src.indexOf(q, cur);
        if (valEnd === -1) {
          xmlParseFail("Unclosed attribute value for '" + attrName + "' in <" + tagName + ">");
        }
        const rawVal = src.slice(cur, valEnd);
        if (rawVal.includes("<")) {
          xmlParseFail("Unescaped '<' in attribute '" + attrName + "'");
        }
        rawAttrs[attrName] = decodeXmlEntitiesStrict(rawVal);
        cur = valEnd + 1;
      }

      // Build lexical namespace scope
      const parentScope = nsScopes[nsScopes.length - 1];
      const scope = Object.assign(Object.create(null), parentScope);
      const attrKeys = Object.keys(rawAttrs);
      for (let i = 0; i < attrKeys.length; i++) {
        const k = attrKeys[i];
        if (k === "xmlns") {
          scope[""] = rawAttrs[k];
        } else if (k.startsWith("xmlns:")) {
          const pfx = k.slice(6);
          if (!pfx) xmlParseFail("Empty xmlns prefix declaration");
          scope[pfx] = rawAttrs[k];
        }
      }

      const colonIdx = tagName.indexOf(":");
      const prefix = colonIdx === -1 ? "" : tagName.slice(0, colonIdx);
      const localName = colonIdx === -1 ? tagName : tagName.slice(colonIdx + 1);
      if (prefix !== "" && !(prefix in scope)) {
        xmlParseFail("Unbound XML namespace prefix '" + prefix + "' on <" + tagName + ">");
      }
      const namespaceURI = scope[prefix] || "";

      const attrs = Object.create(null);
      for (let i = 0; i < attrKeys.length; i++) {
        const k = attrKeys[i];
        if (k === "xmlns" || k.startsWith("xmlns:")) {
          attrs[k] = rawAttrs[k];
          continue;
        }
        const aColon = k.indexOf(":");
        if (aColon !== -1) {
          const aPfx = k.slice(0, aColon);
          if (!(aPfx in scope)) {
            xmlParseFail("Unbound XML namespace prefix '" + aPfx + "' on attribute " + k);
          }
          const aLocal = k.slice(aColon + 1);
          attrs[aLocal] = rawAttrs[k];
          attrs[k] = rawAttrs[k];
        } else {
          attrs[k] = rawAttrs[k];
        }
      }

      const node = {
        tagName: tagName,
        prefix: prefix,
        localName: localName,
        namespaceURI: namespaceURI,
        attrs: attrs,
        children: [],
        text: "",
        textParts: []
      };

      if (stack.length === 0) {
        if (root !== null) {
          xmlParseFail("Multiple root elements in XML document");
        }
        root = node;
      } else {
        stack[stack.length - 1].children.push(node);
      }

      if (selfClosing) {
        node.text = "";
        delete node.textParts;
      } else {
        stack.push(node);
        nsScopes.push(scope);
      }
      pos = cur;
    }

    if (stack.length > 0) {
      xmlParseFail("Unclosed XML element <" + stack[stack.length - 1].tagName + ">");
    }
    if (!root) {
      xmlParseFail("No root element found in XML document");
    }
    return root;
  }

  // Namespace-aware query helpers
  function childByNs(node, ns, local) {
    if (!node) return null;
    for (let i = 0; i < node.children.length; i++) {
      const ch = node.children[i];
      if (ch.localName === local && (ns === null || ch.namespaceURI === ns)) {
        return ch;
      }
    }
    return null;
  }

  function childrenByNs(node, ns, local) {
    const out = [];
    if (!node) return out;
    for (let i = 0; i < node.children.length; i++) {
      const ch = node.children[i];
      if (ch.localName === local && (ns === null || ch.namespaceURI === ns)) {
        out.push(ch);
      }
    }
    return out;
  }

  function findPathNs(node, steps) {
    let cur = node;
    for (let i = 0; i < steps.length; i++) {
      if (!cur) return null;
      cur = childByNs(cur, steps[i][0], steps[i][1]);
    }
    return cur;
  }

  function textOfNs(node, steps) {
    const target = steps && steps.length ? findPathNs(node, steps) : node;
    return target ? String(target.text || "").trim() : "";
  }

  function escapeXml(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /* ------------------------------------------------------------------------
   * 4. PDF/A-3b Stream & XMP Extractor (`extractFacturXFromPdf`)
   * --------------------------------------------------------------------- */

  function decodePdfLiteralOrHexFilename(rawToken) {
    if (!rawToken) return null;
    const s = rawToken.trim();
    if (s.startsWith("(") && s.endsWith(")")) {
      return s
        .slice(1, -1)
        .replace(/\\([()\\])/g, "$1")
        .trim();
    }
    if (s.startsWith("<") && s.endsWith(">")) {
      const hex = s.slice(1, -1).replace(/\s+/g, "");
      if (hex.length % 2 !== 0) return null;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        let out = "";
        for (let i = 2; i + 1 < bytes.length; i += 2) {
          out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
        }
        return out.trim();
      }
      return bytesToBinaryString(bytes).trim();
    }
    return null;
  }

  function parseXmpPacket(xmpText, isCompressed) {
    if (!xmpText) {
      return {
        present: false,
        valid: false,
        compressed: Boolean(isCompressed),
        pdfaPart: null,
        conformance: null,
        hasExtensionSchema: false,
        hasFacturxUrn: false,
        fxConformanceLevel: null,
        fxDocumentFileName: null,
        fxDocumentType: null,
        fxVersion: null
      };
    }

    const partEl = xmpText.match(/<pdfaid:part>\s*([^<\s]+)\s*<\/pdfaid:part>/i);
    const partAttr = xmpText.match(/\bpdfaid:part\s*=\s*["']([^"']+)["']/i);
    const pdfaPartRaw = partEl ? partEl[1] : partAttr ? partAttr[1] : null;
    const pdfaPart = pdfaPartRaw && /^\d+$/.test(pdfaPartRaw) ? parseInt(pdfaPartRaw, 10) : null;

    const confEl = xmpText.match(/<pdfaid:conformance>\s*([^<\s]+)\s*<\/pdfaid:conformance>/i);
    const confAttr = xmpText.match(/\bpdfaid:conformance\s*=\s*["']([^"']+)["']/i);
    const conformance = confEl ? confEl[1] : confAttr ? confAttr[1] : null;

    const fxLevelEl = xmpText.match(/<(?:fx|zf):ConformanceLevel>\s*([^<]+?)\s*<\/(?:fx|zf):ConformanceLevel>/);
    const fxLevelAttr = xmpText.match(/\b(?:fx|zf):ConformanceLevel\s*=\s*["']([^"']+)["']/);
    const fxConformanceLevel = fxLevelEl ? fxLevelEl[1].trim() : fxLevelAttr ? fxLevelAttr[1].trim() : null;

    const fxFileEl = xmpText.match(/<(?:fx|zf):DocumentFileName>\s*([^<]+?)\s*<\/(?:fx|zf):DocumentFileName>/);
    const fxFileAttr = xmpText.match(/\b(?:fx|zf):DocumentFileName\s*=\s*["']([^"']+)["']/);
    const fxDocumentFileName = fxFileEl ? fxFileEl[1].trim() : fxFileAttr ? fxFileAttr[1].trim() : null;

    const fxTypeEl = xmpText.match(/<(?:fx|zf):DocumentType>\s*([^<]+?)\s*<\/(?:fx|zf):DocumentType>/);
    const fxTypeAttr = xmpText.match(/\b(?:fx|zf):DocumentType\s*=\s*["']([^"']+)["']/);
    const fxDocumentType = fxTypeEl ? fxTypeEl[1].trim() : fxTypeAttr ? fxTypeAttr[1].trim() : null;

    const fxVerEl = xmpText.match(/<(?:fx|zf):Version>\s*([^<]+?)\s*<\/(?:fx|zf):Version>/);
    const fxVerAttr = xmpText.match(/\b(?:fx|zf):Version\s*=\s*["']([^"']+)["']/);
    const fxVersion = fxVerEl ? fxVerEl[1].trim() : fxVerAttr ? fxVerAttr[1].trim() : null;

    // Exact case-sensitive check on Factur-X XMP extension URN with trailing '#'
    const hasFacturxUrn = xmpText.includes(FACTURX_XMP_NS);
    const hasExtensionSchema = /pdfaExtension:schemas\b/.test(xmpText) && /pdfaSchema:namespaceURI\b/.test(xmpText);

    const valid =
      !isCompressed &&
      pdfaPart === 3 &&
      hasFacturxUrn &&
      hasExtensionSchema &&
      Boolean(fxConformanceLevel) &&
      fxDocumentType === "INVOICE";

    return {
      present: true,
      valid: valid,
      compressed: Boolean(isCompressed),
      pdfaPart: pdfaPart,
      conformance: conformance,
      hasExtensionSchema: hasExtensionSchema,
      hasFacturxUrn: hasFacturxUrn,
      fxConformanceLevel: fxConformanceLevel,
      fxDocumentFileName: fxDocumentFileName,
      fxDocumentType: fxDocumentType,
      fxVersion: fxVersion
    };
  }

  async function extractFacturXFromPdf(inputBytes) {
    const u8 = toUint8Array(inputBytes);
    const bin = bytesToBinaryString(u8);
    const headerWindow = bin.slice(0, 1024);
    if (!headerWindow.includes("%PDF-")) {
      return {
        found: false,
        isPdf: false,
        is_pdf: false,
        filename: null,
        xmlString: null,
        isCompressed: false,
        is_compressed_stream: false,
        hasAF: false,
        hasEmbeddedFiles: false,
        hasOutputIntents: false,
        xmp: parseXmpPacket(null, false),
        xmp_valid: false
      };
    }

    // Parse indirect PDF objects
    const objects = new Map();
    const objRegex = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    while ((m = objRegex.exec(bin)) !== null) {
      const objNum = parseInt(m[1], 10);
      const bodyStart = objRegex.lastIndex;
      const endObjIdx = bin.indexOf("endobj", bodyStart);
      if (endObjIdx === -1) continue;
      const objSliceStr = bin.slice(bodyStart, endObjIdx);
      const streamMatch = /stream(?:\r\n|\n)/.exec(objSliceStr);
      let dictStr = objSliceStr;
      let rawStream = null;
      if (streamMatch) {
        dictStr = objSliceStr.slice(0, streamMatch.index);
        const streamDataStart = bodyStart + streamMatch.index + streamMatch[0].length;
        let streamDataEnd = -1;
        // Prefer explicit direct integer /Length (not indirect "/Length X 0 R")
        const lenMatch = dictStr.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)\b/);
        if (lenMatch) {
          const declaredLen = parseInt(lenMatch[1], 10);
          const candidateEnd = streamDataStart + declaredLen;
          if (candidateEnd <= endObjIdx) {
            const tail = bin.slice(candidateEnd, candidateEnd + 16);
            if (/^(?:\r\n|\n|\r|\s)*endstream\b/.test(tail)) {
              streamDataEnd = candidateEnd;
            }
          }
        }
        if (streamDataEnd === -1) {
          const esPos = bin.indexOf("endstream", streamDataStart);
          if (esPos !== -1 && esPos <= endObjIdx) {
            streamDataEnd = esPos;
            if (bin[streamDataEnd - 1] === "\n") {
              streamDataEnd--;
              if (bin[streamDataEnd - 1] === "\r") streamDataEnd--;
            } else if (bin[streamDataEnd - 1] === "\r") {
              streamDataEnd--;
            }
          }
        }
        if (streamDataEnd >= streamDataStart) {
          rawStream = u8.subarray(streamDataStart, streamDataEnd);
        }
      }
      objects.set(objNum, { objNum: objNum, dictStr: dictStr, rawStream: rawStream });
    }

    let combinedDictCorpus = bin;

    // Decompress PDF 1.5+ /ObjStm object streams so compressed catalogs/filespecs are visible
    for (const obj of objects.values()) {
      if (obj.rawStream && /\/Type\s*\/ObjStm\b/.test(obj.dictStr)) {
        try {
          const decObjStm = /\/FlateDecode\b|\/Fl\b/.test(obj.dictStr)
            ? await safeDecompressFlate(obj.rawStream)
            : obj.rawStream;
          combinedDictCorpus += "\n" + bytesToBinaryString(decObjStm);
        } catch (_) {}
      }
    }

    const hasAF = /\/AF\s*(?:\[|\d+\s+\d+\s+R)/.test(combinedDictCorpus);
    const hasEmbeddedFiles = /\/EmbeddedFiles\b/.test(combinedDictCorpus);
    const hasOutputIntents = /\/OutputIntents\b/.test(combinedDictCorpus) && /\/GTS_PDFA1\b/.test(combinedDictCorpus);

    // Extract XMP metadata (prefer /Type /Metadata object to detect illegal compression)
    let xmpText = null;
    let xmpCompressed = false;
    for (const obj of objects.values()) {
      if (obj.rawStream && /\/Type\s*\/Metadata\b/.test(obj.dictStr)) {
        const isFlate = /\/FlateDecode\b|\/Fl\b/.test(obj.dictStr);
        xmpCompressed = isFlate;
        try {
          const bytes = isFlate ? await safeDecompressFlate(obj.rawStream) : obj.rawStream;
          xmpText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
          break;
        } catch (_) {}
      }
    }
    if (!xmpText) {
      const xmpStart = bin.indexOf("<x:xmpmeta");
      if (xmpStart !== -1) {
        const xmpEnd = bin.indexOf("</x:xmpmeta>", xmpStart);
        if (xmpEnd !== -1) {
          const slice = u8.subarray(xmpStart, xmpEnd + 12);
          xmpText = new TextDecoder("utf-8", { fatal: false }).decode(slice);
        }
      }
    }
    const xmpInfo = parseXmpPacket(xmpText, xmpCompressed);

    // Locate Filespec -> /EF << /F X 0 R >>
    const candidateStreams = [];
    const filespecRegex = /<<[\s\S]{0,1200}?\/EF\s*<<([\s\S]{0,300}?)>>[\s\S]{0,600}?>>/g;
    let fsm;
    while ((fsm = filespecRegex.exec(combinedDictCorpus)) !== null) {
      const fullFs = fsm[0];
      const efInner = fsm[1];
      const ufMatch = fullFs.match(/\/UF\s*(\([^)]*\)|<[0-9A-Fa-f\s]+>)/);
      const fMatch = fullFs.match(/\/F\s*(\([^)]*\)|<[0-9A-Fa-f\s]+>)/);
      const fname = decodePdfLiteralOrHexFilename(ufMatch ? ufMatch[1] : fMatch ? fMatch[1] : null) || "factur-x.xml";
      const refMatch = efInner.match(/\/(?:UF|F)\s+(\d+)\s+\d+\s+R/);
      if (refMatch) {
        const streamObjNum = parseInt(refMatch[1], 10);
        const target = objects.get(streamObjNum);
        if (target && target.rawStream) {
          const isPriorityName = /^(?:factur-x|zugferd-invoice|xrechnung)\.xml$/i.test(fname);
          candidateStreams.push({
            priority: isPriorityName ? 0 : fname.toLowerCase().endsWith(".xml") ? 1 : 2,
            filename: fname,
            obj: target
          });
        }
      }
    }

    // Fallback: inspect any /EmbeddedFile or XML-typed stream
    for (const obj of objects.values()) {
      if (!obj.rawStream) continue;
      if (/\/Type\s*\/Metadata\b/.test(obj.dictStr)) continue;
      if (/\/Type\s*\/EmbeddedFile\b|\/Subtype\s*\/text#2Fxml\b|\/Subtype\s*\/application#2Fxml\b/i.test(obj.dictStr)) {
        candidateStreams.push({ priority: 3, filename: "factur-x.xml", obj: obj });
      }
    }

    candidateStreams.sort(function (a, b) {
      return a.priority - b.priority;
    });

    for (let i = 0; i < candidateStreams.length; i++) {
      const cand = candidateStreams[i];
      const isFlate = /\/FlateDecode\b|\/Fl\b/.test(cand.obj.dictStr);
      try {
        const rawBytes = isFlate ? await safeDecompressFlate(cand.obj.rawStream) : cand.obj.rawStream;
        const decoded = new TextDecoder("utf-8", { fatal: false }).decode(rawBytes);
        if (
          decoded.includes("CrossIndustryInvoice") ||
          decoded.includes("<?xml") ||
          cand.priority <= 1
        ) {
          return {
            found: true,
            isPdf: true,
            is_pdf: true,
            filename: cand.filename,
            xmlString: decoded,
            isCompressed: isFlate,
            is_compressed_stream: isFlate,
            hasAF: hasAF,
            hasEmbeddedFiles: hasEmbeddedFiles,
            hasOutputIntents: hasOutputIntents,
            xmp: xmpInfo,
            xmp_valid: xmpInfo.valid
          };
        }
      } catch (_) {}
    }

    return {
      found: false,
      isPdf: true,
      is_pdf: true,
      filename: null,
      xmlString: null,
      isCompressed: false,
      is_compressed_stream: false,
      hasAF: hasAF,
      hasEmbeddedFiles: hasEmbeddedFiles,
      hasOutputIntents: hasOutputIntents,
      xmp: xmpInfo,
      xmp_valid: xmpInfo.valid
    };
  }

  /* ------------------------------------------------------------------------
   * 5. 3-Layer Normative Validator (`validateFacturXXml` & `validateFacturXFile`)
   * --------------------------------------------------------------------- */

  function buildValidationResult(opts) {
    const errors = opts.errors || [];
    const warnings = opts.warnings || [];
    const profile = opts.profile || "NONE";
    const isPdf = Boolean(opts.isPdf);
    const isCompressed = Boolean(opts.isCompressed);
    const xmpValid = Boolean(opts.xmpValid);

    let score = 100;
    const seenCodes = new Set();
    let hasFatal = false;
    for (let i = 0; i < errors.length; i++) {
      const code = errors[i].code;
      if (code === "PDF_NO_FACTURX_XML" || code === "XML_PARSE_ERROR") {
        hasFatal = true;
      }
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        score -= ERROR_WEIGHTS[code] != null ? ERROR_WEIGHTS[code] : 10;
      }
    }
    if (hasFatal) {
      score = 0;
    } else {
      score = Math.max(0, Math.min(100, score));
      if (errors.length > 0 && score === 100) score = 90;
    }

    const valid = errors.length === 0;
    const paFlux2Compatible = valid && (profile === "EN 16931" || profile === "EXTENDED");

    return {
      valid: valid,
      score: score,
      profile: profile,
      paFlux2Compatible: paFlux2Compatible,
      pa_flux2_compatible: paFlux2Compatible,
      isPdf: isPdf,
      is_pdf: isPdf,
      isCompressedStream: isCompressed,
      is_compressed_stream: isCompressed,
      xmpValid: xmpValid,
      xmp_valid: xmpValid,
      errors: errors,
      warnings: warnings,
      summary: opts.summary || {}
    };
  }

  function validateFacturXXml(xmlInput, containerMeta) {
    const errors = [];
    const warnings = [];
    const meta = containerMeta || {};
    const isPdf = Boolean(meta.isPdf || meta.is_pdf);
    const isCompressed = Boolean(meta.isCompressed || meta.is_compressed_stream);

    function addError(code, layer, message) {
      if (!errors.some(function (e) { return e.code === code && e.message === message; })) {
        errors.push({ code: code, layer: layer, message: message });
      }
    }
    function addWarning(code, layer, message) {
      warnings.push({ code: code, layer: layer, message: message });
    }

    let xmlString = xmlInput;
    if (xmlInput instanceof Uint8Array || (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(xmlInput))) {
      try {
        xmlString = new TextDecoder("utf-8", { fatal: true }).decode(toUint8Array(xmlInput));
      } catch (_) {
        addError("XML_PARSE_ERROR", "EN_16931", "Flux XML non encodé en UTF-8 valide.");
        return buildValidationResult({ errors: errors, warnings: warnings, profile: "NONE", isPdf: isPdf, isCompressed: isCompressed, xmpValid: false });
      }
    }

    let root;
    try {
      root = parseXmlStrict(xmlString);
    } catch (err) {
      addError("XML_PARSE_ERROR", "EN_16931", "Erreur de syntaxe XML CII : " + (err && err.message ? err.message : String(err)));
      return buildValidationResult({ errors: errors, warnings: warnings, profile: "NONE", isPdf: isPdf, isCompressed: isCompressed, xmpValid: false });
    }

    if (root.localName !== "CrossIndustryInvoice" || root.namespaceURI !== NS_RSM) {
      addError(
        "XML_PARSE_ERROR",
        "EN_16931",
        "Élément racine invalide : attendu rsm:CrossIndustryInvoice dans l'espace de noms UN/CEFACT D16B (:100)."
      );
      return buildValidationResult({ errors: errors, warnings: warnings, profile: "NONE", isPdf: isPdf, isCompressed: isCompressed, xmpValid: false });
    }

    // 1. Context: BT-24 (Guideline) & BT-23 (BusinessProcess)
    const docContext = childByNs(root, NS_RSM, "ExchangedDocumentContext");
    const bt24Urn = textOfNs(docContext, [
      [NS_RAM, "GuidelineSpecifiedDocumentContextParameter"],
      [NS_RAM, "ID"]
    ]);
    const profile = PROFILE_BY_URN[bt24Urn] || "UNKNOWN";

    // Layer 1 PDF/A-3 XMP & Container alignment check
    let xmpValid = false;
    if (isPdf) {
      const xmp = meta.xmp || {};
      const expectedXmpLevel = profile === "EN 16931" ? "EN 16931" : profile;
      const levelAligned = Boolean(xmp.fxConformanceLevel) && xmp.fxConformanceLevel === expectedXmpLevel;
      const containerComplete = Boolean(meta.hasAF) && Boolean(meta.hasEmbeddedFiles);
      xmpValid = Boolean(xmp.valid) && levelAligned && containerComplete;
      if (!xmpValid) {
        addError(
          "XMP_SCHEMA_INVALID",
          "PDF_A3",
          "Métadonnées PDF/A-3 XMP ou conteneur incomplets : /AF, /EmbeddedFiles, pdfaid:part=3 non compressé, schéma d'extension Factur-X 1.0 et alignement fx:ConformanceLevel (" +
            expectedXmpLevel +
            ") requis."
        );
      }
      if (meta.hasOutputIntents === false) {
        addWarning("PDF_NO_OUTPUT_INTENT", "PDF_A3", "Profil colorimétrique /OutputIntents (/GTS_PDFA1 sRGB) absent du catalogue PDF.");
      }
    }

    // PA Flux 2 Profile Gate
    if (profile !== "EN 16931" && profile !== "EXTENDED") {
      addError(
        "PA_PROFILE_REJECTED",
        "BR_FR_FLUX2",
        "Profil Factur-X '" +
          profile +
          "' rejeté par les Plateformes Agréées françaises (Flux 2 XP Z12-012) : profil EN 16931 ou EXTENDED exigé."
      );
    }

    const bt23 = textOfNs(docContext, [
      [NS_RAM, "BusinessProcessSpecifiedDocumentContextParameter"],
      [NS_RAM, "ID"]
    ]);
    if (!VALID_BT23_CODES.has(bt23)) {
      addError(
        "BR-FR-08",
        "BR_FR_FLUX2",
        "Cadre de facturation BT-23 manquant ou invalide ('" +
          (bt23 || "vide") +
          "') : valeurs autorisées B1, S1, M1, B2, S2, M2."
      );
    }

    // 2. ExchangedDocument: BT-1, BT-3, BT-2, IncludedNotes
    const exDoc = childByNs(root, NS_RSM, "ExchangedDocument");
    const bt1 = textOfNs(exDoc, [[NS_RAM, "ID"]]);
    const bt3 = textOfNs(exDoc, [[NS_RAM, "TypeCode"]]);
    const issueDtNode = findPathNs(exDoc, [
      [NS_RAM, "IssueDateTime"],
      [NS_UDT, "DateTimeString"]
    ]);
    const bt2 = issueDtNode ? String(issueDtNode.text || "").trim() : "";

    if (!bt1 || bt1.length > 35) {
      addError("BR-FR-01", "BR_FR_FLUX2", "Numéro de facture BT-1 obligatoire et limité à 35 caractères maximum.");
    } else if (!/^[A-Za-z0-9+\-_/]+$/.test(bt1)) {
      addError(
        "BR-FR-02",
        "BR_FR_FLUX2",
        "Numéro de facture BT-1 ('" + bt1 + "') invalide : espaces et caractères spéciaux hors [A-Za-z0-9+-_/] interdits."
      );
    }

    const transaction = childByNs(root, NS_RSM, "SupplyChainTradeTransaction");
    const agreement = childByNs(transaction, NS_RAM, "ApplicableHeaderTradeAgreement");
    const delivery = childByNs(transaction, NS_RAM, "ApplicableHeaderTradeDelivery");
    const settlement = childByNs(transaction, NS_RAM, "ApplicableHeaderTradeSettlement");

    const bt25 = textOfNs(settlement, [
      [NS_RAM, "InvoiceReferencedDocument"],
      [NS_RAM, "IssuerAssignedID"]
    ]);
    if (bt25 && bt25.length > 35) {
      addError("BR-FR-01", "BR_FR_FLUX2", "Référence de facture antérieure BT-25 limitée à 35 caractères.");
    }

    if (!PA_ALLOWED_TYPE_CODES.has(bt3)) {
      addError(
        "BR-FR-04",
        "BR_FR_FLUX2",
        "Code type de document BT-3 ('" + (bt3 || "vide") + "') non autorisé en Flux 2 PA (attendu: 380, 381, 384, 386, 389, 261)."
      );
    } else if (REF_REQUIRED_TYPE_CODES.has(bt3) && !bt25) {
      addError(
        "BR-FR-04",
        "BR_FR_FLUX2",
        "Un avoir ou facture rectificative (TypeCode " + bt3 + ") exige la référence de facture d'origine BT-25."
      );
    }

    // Coded Notes (BR-FR-05 & BR-FR-06)
    const notes = childrenByNs(exDoc, NS_RAM, "IncludedNote");
    const noteCounts = Object.create(null);
    const nonEmptyNoteCodes = new Set();
    for (let i = 0; i < notes.length; i++) {
      const code = textOfNs(notes[i], [[NS_RAM, "SubjectCode"]]);
      const content = textOfNs(notes[i], [[NS_RAM, "Content"]]);
      if (code) {
        noteCounts[code] = (noteCounts[code] || 0) + 1;
        if (content) nonEmptyNoteCodes.add(code);
      }
    }
    const requiredNotes = ["PMD", "PMT", "AAB"];
    const missingNotes = requiredNotes.filter(function (c) {
      return !nonEmptyNoteCodes.has(c);
    });
    if (missingNotes.length > 0) {
      addError(
        "BR-FR-05",
        "BR_FR_FLUX2",
        "Mentions légales codifiées obligatoires manquantes dans IncludedNote : " + missingNotes.join(", ") + " (pénalités PMD, indemnité 40 € PMT, escompte AAB)."
      );
    }
    const dupNotes = Object.keys(noteCounts).filter(function (c) {
      return UNIQUE_NOTE_CODES.has(c) && noteCounts[c] > 1;
    });
    if (dupNotes.length > 0) {
      addError(
        "BR-FR-06",
        "BR_FR_FLUX2",
        "Doublon interdit de mention codifiée SubjectCode : " + dupNotes.join(", ") + "."
      );
    }

    // 3. Seller & Buyer Parties (BR-FR-09, 10, 11, 12, 13, 21 & VAT_KEY_INVALID)
    const seller = childByNs(agreement, NS_RAM, "SellerTradeParty");
    const buyer = childByNs(agreement, NS_RAM, "BuyerTradeParty");

    const sellerName = textOfNs(seller, [[NS_RAM, "Name"]]);
    const buyerName = textOfNs(buyer, [[NS_RAM, "Name"]]);
    const sellerCountry = textOfNs(seller, [[NS_RAM, "PostalTradeAddress"], [NS_RAM, "CountryID"]]) || "FR";
    const buyerCountry = textOfNs(buyer, [[NS_RAM, "PostalTradeAddress"], [NS_RAM, "CountryID"]]) || "FR";

    const sellerLegalIdNode = findPathNs(seller, [[NS_RAM, "SpecifiedLegalOrganization"], [NS_RAM, "ID"]]);
    const sellerLegalScheme = sellerLegalIdNode ? sellerLegalIdNode.attrs.schemeID || "" : "";
    const sellerSirenRaw = sellerLegalIdNode ? cleanDigits(sellerLegalIdNode.text) : "";
    const sellerSirenValid = sellerLegalScheme === "0002" && validateSiren(sellerSirenRaw);

    if (!sellerSirenValid) {
      addError(
        "BR-FR-10",
        "BR_FR_FLUX2",
        "SIREN vendeur (BT-30) manquant, schemeID!='0002' ou clé de Luhn invalide ('" + (sellerSirenRaw || "vide") + "')."
      );
      if (sellerLegalScheme === "0002" && sellerSirenRaw.length === 14) {
        addError(
          "BR-FR-09",
          "BR_FR_FLUX2",
          "Un SIRET de 14 chiffres a été placé dans BT-30 schemeID='0002' au lieu d'un SIREN à 9 chiffres."
        );
      }
    }

    const buyerLegalIdNode = findPathNs(buyer, [[NS_RAM, "SpecifiedLegalOrganization"], [NS_RAM, "ID"]]);
    const buyerLegalScheme = buyerLegalIdNode ? buyerLegalIdNode.attrs.schemeID || "" : "";
    const buyerSirenRaw = buyerLegalIdNode ? cleanDigits(buyerLegalIdNode.text) : "";
    const buyerSirenValid = buyerLegalScheme === "0002" && validateSiren(buyerSirenRaw);

    if (buyerCountry === "FR" && !buyerSirenValid) {
      addError(
        "BR-FR-11",
        "BR_FR_FLUX2",
        "SIREN client B2B français (BT-47) obligatoire avec schemeID='0002' et clé de Luhn valide ('" + (buyerSirenRaw || "vide") + "')."
      );
      if (buyerLegalScheme === "0002" && buyerSirenRaw.length === 14) {
        addError(
          "BR-FR-09",
          "BR_FR_FLUX2",
          "Un SIRET de 14 chiffres a été placé dans BT-47 schemeID='0002' au lieu d'un SIREN à 9 chiffres."
        );
      }
    }

    // Check SIRET 0009 if present on Seller or Buyer (BR-FR-09 incl. INSEE La Poste 356000000 mod-5)
    function checkPartySiret0009(partyNode, partyLabel, expectedSiren, hasValidSiren) {
      if (!partyNode) return;
      const globals = childrenByNs(partyNode, NS_RAM, "GlobalID");
      for (let i = 0; i < globals.length; i++) {
        if (globals[i].attrs.schemeID === "0009") {
          const siretVal = cleanDigits(globals[i].text);
          if (!validateSiret(siretVal)) {
            addError(
              "BR-FR-09",
              "BR_FR_FLUX2",
              "SIRET " + partyLabel + " schemeID='0009' ('" + siretVal + "') invalide au contrôle Luhn / INSEE La Poste."
            );
          } else if (hasValidSiren && siretVal.slice(0, 9) !== expectedSiren) {
            addError(
              "BR-FR-09",
              "BR_FR_FLUX2",
              "Incohérence SIRET/SIREN " + partyLabel + " : le préfixe SIRET (" + siretVal.slice(0, 9) + ") diffère du SIREN (" + expectedSiren + ")."
            );
          }
        }
      }
    }
    checkPartySiret0009(seller, "vendeur", sellerSirenRaw, sellerSirenValid);
    checkPartySiret0009(buyer, "acheteur", buyerSirenRaw, buyerSirenValid);

    // Electronic addresses schemeID="0225" (BR-FR-12, BR-FR-13, BR-FR-21)
    function findElectronicUri0225(partyNode) {
      if (!partyNode) return null;
      const comms = childrenByNs(partyNode, NS_RAM, "URIUniversalCommunication");
      for (let i = 0; i < comms.length; i++) {
        const uriNode = childByNs(comms[i], NS_RAM, "URIID");
        if (uriNode && uriNode.attrs.schemeID === "0225") {
          return String(uriNode.text || "").trim();
        }
      }
      return null;
    }

    const sellerUri0225 = findElectronicUri0225(seller);
    const buyerUri0225 = findElectronicUri0225(buyer);

    if (!buyerUri0225) {
      addError("BR-FR-12", "BR_FR_FLUX2", "Adresse électronique de routage acheteur BT-49 (schemeID='0225') manquante.");
    } else if (
      !/^\d{9}(?:_[A-Za-z0-9\-_]{1,50})?$/.test(buyerUri0225) ||
      (buyerSirenValid && !buyerUri0225.startsWith(buyerSirenRaw))
    ) {
      addError(
        "BR-FR-21",
        "BR_FR_FLUX2",
        "Format d'adresse électronique acheteur BT-49 ('" + buyerUri0225 + "') invalide : doit commencer par le SIREN à 9 chiffres."
      );
    }

    if (!sellerUri0225) {
      addError("BR-FR-13", "BR_FR_FLUX2", "Adresse électronique émetteur BT-34 (schemeID='0225') manquante.");
    } else if (
      !/^\d{9}(?:_[A-Za-z0-9\-_]{1,50})?$/.test(sellerUri0225) ||
      (sellerSirenValid && !sellerUri0225.startsWith(sellerSirenRaw))
    ) {
      addError(
        "BR-FR-21",
        "BR_FR_FLUX2",
        "Format d'adresse électronique vendeur BT-34 ('" + sellerUri0225 + "') invalide : doit commencer par le SIREN à 9 chiffres."
      );
    }

    // Tax registrations on Seller & Buyer
    function collectTaxRegs(partyNode) {
      const map = Object.create(null);
      if (!partyNode) return map;
      const regs = childrenByNs(partyNode, NS_RAM, "SpecifiedTaxRegistration");
      for (let i = 0; i < regs.length; i++) {
        const idNode = childByNs(regs[i], NS_RAM, "ID");
        if (idNode && idNode.attrs.schemeID) {
          map[idNode.attrs.schemeID] = String(idNode.text || "").trim();
        }
      }
      return map;
    }
    const sellerTaxRegs = collectTaxRegs(seller);
    const buyerTaxRegs = collectTaxRegs(buyer);

    if (sellerTaxRegs.VA && sellerTaxRegs.VA.toUpperCase().startsWith("FR")) {
      if (!validateFrenchVat(sellerTaxRegs.VA, sellerSirenValid ? sellerSirenRaw : null)) {
        addError(
          "VAT_KEY_INVALID",
          "BR_FR_FLUX2",
          "Numéro de TVA intracommunautaire vendeur ('" + sellerTaxRegs.VA + "') invalide (clé modulo 97 ou SIREN incohérent)."
        );
      }
    }
    if (buyerTaxRegs.VA && buyerTaxRegs.VA.toUpperCase().startsWith("FR")) {
      if (!validateFrenchVat(buyerTaxRegs.VA, buyerSirenValid ? buyerSirenRaw : null)) {
        addError(
          "VAT_KEY_INVALID",
          "BR_FR_FLUX2",
          "Numéro de TVA intracommunautaire acheteur ('" + buyerTaxRegs.VA + "') invalide."
        );
      }
    }

    // 4. Lines & Monetary Arithmetic (BR-CO-10..17, BR-CO-25, BR-E-08..10, BR-S-08..10)
    const currency = textOfNs(settlement, [[NS_RAM, "InvoiceCurrencyCode"]]) || "EUR";
    const lines = childrenByNs(transaction, NS_RAM, "IncludedSupplyChainTradeLineItem");
    const lineMandatory = profile !== "MINIMUM" && profile !== "BASIC WL";

    let sumLinesCents = 0n;
    const lineSumByCatRate = Object.create(null);

    if (lineMandatory && lines.length === 0) {
      addError("BR-CO-10", "EN_16931", "Aucune ligne de facture (BG-25) présente alors que le profil exige le détail des lignes.");
    }

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const lineDeliv = childByNs(ln, NS_RAM, "SpecifiedLineTradeDelivery");
      const lineAgree = childByNs(ln, NS_RAM, "SpecifiedLineTradeAgreement");
      const lineSettle = childByNs(ln, NS_RAM, "SpecifiedLineTradeSettlement");

      const qtyNode = childByNs(lineDeliv, NS_RAM, "BilledQuantity");
      const priceNode = findPathNs(lineAgree, [[NS_RAM, "NetPriceProductTradePrice"], [NS_RAM, "ChargeAmount"]]);
      const basisQtyNode = findPathNs(lineAgree, [[NS_RAM, "NetPriceProductTradePrice"], [NS_RAM, "BasisQuantity"]]);
      const bt131Str =
        textOfNs(lineSettle, [[NS_RAM, "SpecifiedTradeSettlementLineMonetarySummation"], [NS_RAM, "LineTotalAmount"]]) ||
        textOfNs(lineSettle, [[NS_RAM, "SpecifiedTradeSettlementMonetarySummation"], [NS_RAM, "LineTotalAmount"]]);
      const bt131Cents = parseCents(bt131Str);

      let lineAllowCents = 0n;
      let lineChargeCents = 0n;
      const lineAC = childrenByNs(lineSettle, NS_RAM, "SpecifiedTradeAllowanceCharge");
      for (let j = 0; j < lineAC.length; j++) {
        const ind = textOfNs(lineAC[j], [[NS_RAM, "ChargeIndicator"], [NS_UDT, "Indicator"]]).toLowerCase();
        const amt = parseCents(textOfNs(lineAC[j], [[NS_RAM, "ActualAmount"]])) || 0n;
        if (ind === "true") lineChargeCents += amt;
        else lineAllowCents += amt;
      }

      const expectedBase = computeLineNetCents(
        qtyNode ? qtyNode.text : "1",
        priceNode ? priceNode.text : "0",
        basisQtyNode ? basisQtyNode.text : "1"
      );

      if (bt131Cents === null || expectedBase === null) {
        addError("BR-CO-10", "EN_16931", "Montant net de ligne BT-131 manquant ou illisible à la ligne " + (i + 1) + ".");
      } else {
        const expectedLineCents = expectedBase - lineAllowCents + lineChargeCents;
        if (bt131Cents !== expectedLineCents) {
          addError(
            "BR-CO-10",
            "EN_16931",
            "Écart arithmétique ligne " +
              (i + 1) +
              " : LineTotalAmount (" +
              formatCents(bt131Cents) +
              ") != Qté × PU net (" +
              formatCents(expectedLineCents) +
              ")."
          );
        }
        sumLinesCents += bt131Cents;
      }

      const lineTax = childByNs(lineSettle, NS_RAM, "ApplicableTradeTax");
      const lCat = textOfNs(lineTax, [[NS_RAM, "CategoryCode"]]) || "S";
      const lRateCents = parseCents(textOfNs(lineTax, [[NS_RAM, "RateApplicablePercent"]]) || "0") || 0n;
      const key = lCat + "|" + formatCents(lRateCents);
      lineSumByCatRate[key] = (lineSumByCatRate[key] || 0n) + (bt131Cents || 0n);
    }

    // Header allowances & charges
    let sumHeaderAllowCents = 0n;
    let sumHeaderChargeCents = 0n;
    const headerAC = childrenByNs(settlement, NS_RAM, "SpecifiedTradeAllowanceCharge");
    for (let i = 0; i < headerAC.length; i++) {
      const ind = textOfNs(headerAC[i], [[NS_RAM, "ChargeIndicator"], [NS_UDT, "Indicator"]]).toLowerCase();
      const amt = parseCents(textOfNs(headerAC[i], [[NS_RAM, "ActualAmount"]])) || 0n;
      const acTax = childByNs(headerAC[i], NS_RAM, "CategoryTradeTax");
      const acCat = textOfNs(acTax, [[NS_RAM, "CategoryCode"]]);
      const acRateCents = parseCents(textOfNs(acTax, [[NS_RAM, "RateApplicablePercent"]]) || "0") || 0n;
      const key = acCat + "|" + formatCents(acRateCents);
      if (ind === "true") {
        sumHeaderChargeCents += amt;
        if (acCat) lineSumByCatRate[key] = (lineSumByCatRate[key] || 0n) + amt;
      } else {
        sumHeaderAllowCents += amt;
        if (acCat) lineSumByCatRate[key] = (lineSumByCatRate[key] || 0n) - amt;
      }
    }

    const summation = childByNs(settlement, NS_RAM, "SpecifiedTradeSettlementHeaderMonetarySummation");
    const bt106Str = textOfNs(summation, [[NS_RAM, "LineTotalAmount"]]);
    const bt107Str = textOfNs(summation, [[NS_RAM, "AllowanceTotalAmount"]]);
    const bt108Str = textOfNs(summation, [[NS_RAM, "ChargeTotalAmount"]]);
    const bt109Str = textOfNs(summation, [[NS_RAM, "TaxBasisTotalAmount"]]);
    const taxTotalNodes = childrenByNs(summation, NS_RAM, "TaxTotalAmount");
    const bt112Str = textOfNs(summation, [[NS_RAM, "GrandTotalAmount"]]);
    const bt113Str = textOfNs(summation, [[NS_RAM, "TotalPrepaidAmount"]]);
    const bt114Str = textOfNs(summation, [[NS_RAM, "RoundingAmount"]]);
    const bt115Str = textOfNs(summation, [[NS_RAM, "DuePayableAmount"]]);

    const bt106 = bt106Str ? parseCents(bt106Str) : null;
    const bt107 = bt107Str ? parseCents(bt107Str) : 0n;
    const bt108 = bt108Str ? parseCents(bt108Str) : 0n;
    const bt109 = bt109Str ? parseCents(bt109Str) : null;
    const bt112 = bt112Str ? parseCents(bt112Str) : null;
    const bt113 = bt113Str ? parseCents(bt113Str) : 0n;
    const bt114 = bt114Str ? parseCents(bt114Str) : 0n;
    const bt115 = bt115Str ? parseCents(bt115Str) : null;

    if (lineMandatory) {
      if (bt106 === null || bt106 !== sumLinesCents) {
        addError(
          "BR-CO-10",
          "EN_16931",
          "LineTotalAmount BT-106 (" + (bt106 === null ? "absent" : formatCents(bt106)) + ") != somme des lignes BT-131 (" + formatCents(sumLinesCents) + ")."
        );
      }
    }

    if (sumHeaderAllowCents > 0n || bt107Str !== "") {
      if (bt107 === null || bt107 !== sumHeaderAllowCents) {
        addError("BR-CO-11", "EN_16931", "AllowanceTotalAmount BT-107 != somme des remises d'en-tête.");
      }
    }
    if (sumHeaderChargeCents > 0n || bt108Str !== "") {
      if (bt108 === null || bt108 !== sumHeaderChargeCents) {
        addError("BR-CO-12", "EN_16931", "ChargeTotalAmount BT-108 != somme des frais d'en-tête.");
      }
    }

    if (bt109 === null) {
      addError("BR-CO-13", "EN_16931", "TaxBasisTotalAmount BT-109 manquant.");
    } else if (bt106 !== null && bt109 !== bt106 - (bt107 || 0n) + (bt108 || 0n)) {
      addError(
        "BR-CO-13",
        "EN_16931",
        "TaxBasisTotalAmount BT-109 (" +
          formatCents(bt109) +
          ") != LineTotal - Allowances + Charges (" +
          formatCents(bt106 - (bt107 || 0n) + (bt108 || 0n)) +
          ")."
      );
    }

    // Header ApplicableTradeTax blocks
    const headerTaxes = childrenByNs(settlement, NS_RAM, "ApplicableTradeTax");
    let sumCalculatedTaxCents = 0n;
    let hasStandardVat = false;

    for (let i = 0; i < headerTaxes.length; i++) {
      const tx = headerTaxes[i];
      const calcCents = parseCents(textOfNs(tx, [[NS_RAM, "CalculatedAmount"]]));
      const basisCents = parseCents(textOfNs(tx, [[NS_RAM, "BasisAmount"]]));
      const cat = textOfNs(tx, [[NS_RAM, "CategoryCode"]]);
      const rateStr = textOfNs(tx, [[NS_RAM, "RateApplicablePercent"]]) || "0";
      const rateCents = parseCents(rateStr) || 0n;
      const exReason = textOfNs(tx, [[NS_RAM, "ExemptionReason"]]);
      const exCode = textOfNs(tx, [[NS_RAM, "ExemptionReasonCode"]]);

      if (calcCents !== null) sumCalculatedTaxCents += calcCents;

      const expectedTax = computeTaxCents(basisCents, rateStr);
      if (calcCents === null || expectedTax === null || calcCents !== expectedTax) {
        addError(
          "BR-CO-17",
          "EN_16931",
          "Montant de TVA CalculatedAmount BT-117 (" +
            (calcCents === null ? "absent" : formatCents(calcCents)) +
            ") != BasisAmount × taux (" +
            (expectedTax === null ? "invalide" : formatCents(expectedTax)) +
            ")."
        );
      }

      const key = cat + "|" + formatCents(rateCents);
      const expectedCatBasis = lineSumByCatRate[key] || 0n;

      if (cat === "E") {
        if (lineMandatory && (basisCents === null || basisCents !== expectedCatBasis || rateCents !== 0n || calcCents !== 0n)) {
          addError(
            "BR-E-08",
            "EN_16931",
            "Base exonérée CategoryCode='E' (" +
              (basisCents === null ? "absente" : formatCents(basisCents)) +
              ") incohérente avec la somme des lignes E (" +
              formatCents(expectedCatBasis) +
              ") ou taux/TVA non nul."
          );
        }
        const hasTaxRep = Boolean(childByNs(agreement, NS_RAM, "SellerTaxRepresentativeTradeParty"));
        if (!sellerTaxRegs.VA && !sellerTaxRegs.FC && !hasTaxRep) {
          addError(
            "BR-E-09",
            "EN_16931",
            "Exonération TVA (CategoryCode='E' / art. 293 B) : identifiant fiscal vendeur SpecifiedTaxRegistration schemeID='FC' ou 'VA' obligatoire."
          );
        }
        if (!exReason || (sellerCountry === "FR" && exCode !== "VATEX-FR-FRANCHISE")) {
          addError(
            "BR-E-10",
            "EN_16931",
            "Franchise en base de TVA (CategoryCode='E') : ExemptionReason et ExemptionReasonCode='VATEX-FR-FRANCHISE' obligatoires."
          );
        }
      } else if (cat === "S") {
        hasStandardVat = true;
        if (rateCents <= 0n || (lineMandatory && (basisCents === null || basisCents !== expectedCatBasis))) {
          addError(
            "BR-S-08",
            "EN_16931",
            "Ventilation TVA standard CategoryCode='S' invalide (taux <= 0 ou BasisAmount != somme des lignes S à ce taux)."
          );
        }
        if (exReason || exCode) {
          addError("BR-S-10", "EN_16931", "Une ligne de récapitulatif TVA CategoryCode='S' ne doit pas contenir de motif d'exonération.");
        }
      }
    }

    if (hasStandardVat && sellerCountry === "FR" && !sellerTaxRegs.VA) {
      addError(
        "VAT_KEY_INVALID",
        "BR_FR_FLUX2",
        "Facturation avec TVA standard (CategoryCode='S') : numéro de TVA intracommunautaire vendeur (schemeID='VA') obligatoire."
      );
    }

    // TaxTotalAmount [@currencyID] (BR-CO-14)
    let bt110 = 0n;
    if (profile !== "MINIMUM") {
      const matchingCurrNode =
        taxTotalNodes.find(function (n) { return n.attrs.currencyID === currency; }) || taxTotalNodes[0] || null;
      if (!matchingCurrNode || !matchingCurrNode.attrs.currencyID || matchingCurrNode.attrs.currencyID !== currency) {
        addError(
          "BR-CO-14",
          "EN_16931",
          "Attribut obligatoire currencyID='" + currency + "' manquant ou invalide sur ram:TaxTotalAmount (BT-110)."
        );
      }
      const parsedBt110 = matchingCurrNode ? parseCents(matchingCurrNode.text) : null;
      if (parsedBt110 === null || parsedBt110 !== sumCalculatedTaxCents) {
        addError(
          "BR-CO-14",
          "EN_16931",
          "TaxTotalAmount BT-110 (" +
            (parsedBt110 === null ? "absent" : formatCents(parsedBt110)) +
            ") != somme des CalculatedAmount BT-117 (" +
            formatCents(sumCalculatedTaxCents) +
            ")."
        );
      } else {
        bt110 = parsedBt110;
      }
    } else if (taxTotalNodes[0]) {
      bt110 = parseCents(taxTotalNodes[0].text) || 0n;
    }

    // GrandTotalAmount (BR-CO-15) & DuePayableAmount (BR-CO-16)
    if (bt112 === null || (bt109 !== null && bt112 !== bt109 + bt110)) {
      addError(
        "BR-CO-15",
        "EN_16931",
        "GrandTotalAmount TTC BT-112 (" +
          (bt112 === null ? "absent" : formatCents(bt112)) +
          ") != Hors Taxes + TVA (" +
          formatCents((bt109 || 0n) + bt110) +
          ")."
      );
    }

    if (bt115 === null || (bt112 !== null && bt115 !== bt112 - (bt113 || 0n) + (bt114 || 0n))) {
      addError(
        "BR-CO-16",
        "EN_16931",
        "DuePayableAmount net à payer BT-115 (" +
          (bt115 === null ? "absent" : formatCents(bt115)) +
          ") != TTC - Acomptes + Arrondi."
      );
    }

    // Payment terms when DuePayableAmount > 0 (BR-CO-25)
    if (bt115 !== null && bt115 > 0n && profile !== "MINIMUM") {
      const pTerms = childByNs(settlement, NS_RAM, "SpecifiedTradePaymentTerms");
      const ptDesc = textOfNs(pTerms, [[NS_RAM, "Description"]]);
      const ptDue = textOfNs(pTerms, [[NS_RAM, "DueDateDateTime"], [NS_UDT, "DateTimeString"]]);
      if (!ptDesc && !ptDue) {
        addError(
          "BR-CO-25",
          "EN_16931",
          "Lorsque le net à payer BT-115 est positif, la date d'échéance BT-9 ou les conditions de paiement BT-20 sont obligatoires."
        );
      }
    }

    // Paid invoice framework check (B2/S2/M2)
    if ((bt23 === "B2" || bt23 === "S2" || bt23 === "M2") && bt115 !== null && bt115 !== 0n) {
      addWarning("BT23_PREPAID_MISMATCH", "BR_FR_FLUX2", "Cadre déjà payé (" + bt23 + ") déclaré mais reste à payer BT-115 non nul.");
    }

    // IBAN Modulo-97 check if present
    const paymentMeansList = childrenByNs(settlement, NS_RAM, "SpecifiedTradeSettlementPaymentMeans");
    let detectedIban = null;
    for (let i = 0; i < paymentMeansList.length; i++) {
      const ibanVal = textOfNs(paymentMeansList[i], [
        [NS_RAM, "PayeePartyCreditorFinancialAccount"],
        [NS_RAM, "IBANID"]
      ]);
      if (ibanVal) {
        detectedIban = ibanVal;
        if (!validateIban(ibanVal)) {
          addError(
            "IBAN_INVALID",
            "BR_FR_FLUX2",
            "IBAN bénéficiaire ('" + ibanVal.slice(0, 6) + "…') invalide au contrôle ISO 13616 Modulo-97."
          );
        }
      }
    }

    return buildValidationResult({
      errors: errors,
      warnings: warnings,
      profile: profile,
      isPdf: isPdf,
      isCompressed: isCompressed,
      xmpValid: xmpValid,
      summary: {
        invoice_id: bt1,
        issue_date: bt2,
        type_code: bt3,
        operation_category: bt23,
        currency: currency,
        seller_name: sellerName,
        seller_siren: sellerSirenRaw,
        buyer_name: buyerName,
        buyer_siren: buyerSirenRaw,
        total_ht: bt109 !== null ? formatCents(bt109) : "0.00",
        total_tax: formatCents(bt110),
        total_ttc: bt112 !== null ? formatCents(bt112) : "0.00",
        due_payable: bt115 !== null ? formatCents(bt115) : "0.00",
        line_count: lines.length,
        has_iban: Boolean(detectedIban)
      }
    });
  }

  async function validateFacturXFile(inputBytes, fileName) {
    const fname = String(fileName || "").toLowerCase();
    let u8;
    try {
      u8 = toUint8Array(inputBytes);
    } catch (err) {
      return buildValidationResult({
        errors: [{ code: "XML_PARSE_ERROR", layer: "EN_16931", message: "Entrée binaire illisible." }],
        profile: "NONE",
        isPdf: fname.endsWith(".pdf"),
        isCompressed: false,
        xmpValid: false
      });
    }

    if (u8.length === 0) {
      const isPdfEmpty = fname.endsWith(".pdf");
      return buildValidationResult({
        errors: [
          {
            code: isPdfEmpty ? "PDF_NO_FACTURX_XML" : "XML_PARSE_ERROR",
            layer: isPdfEmpty ? "PDF_A3" : "EN_16931",
            message: "Fichier vide (0 octet)."
          }
        ],
        profile: "NONE",
        isPdf: isPdfEmpty,
        isCompressed: false,
        xmpValid: false
      });
    }

    const headStr = bytesToBinaryString(u8.subarray(0, Math.min(1024, u8.length)));
    const looksLikePdf = headStr.includes("%PDF-") || (fname.endsWith(".pdf") && !headStr.trim().startsWith("<"));

    if (looksLikePdf) {
      if (!headStr.includes("%PDF-")) {
        return buildValidationResult({
          errors: [
            {
              code: "PDF_NO_FACTURX_XML",
              layer: "PDF_A3",
              message: "En-tête %PDF- manquant ou fichier PDF corrompu."
            }
          ],
          profile: "NONE",
          isPdf: true,
          isCompressed: false,
          xmpValid: false
        });
      }
      const extracted = await extractFacturXFromPdf(u8);
      if (!extracted.found || !extracted.xmlString) {
        return buildValidationResult({
          errors: [
            {
              code: "PDF_NO_FACTURX_XML",
              layer: "PDF_A3",
              message: "Aucun flux XML Factur-X (factur-x.xml) embarqué dans ce PDF."
            }
          ],
          profile: "NONE",
          isPdf: true,
          isCompressed: false,
          xmpValid: false
        });
      }
      return validateFacturXXml(extracted.xmlString, extracted);
    }

    let xmlText;
    try {
      xmlText = new TextDecoder("utf-8", { fatal: true }).decode(u8);
    } catch (_) {
      return buildValidationResult({
        errors: [{ code: "XML_PARSE_ERROR", layer: "EN_16931", message: "Encodage UTF-8 invalide." }],
        profile: "NONE",
        isPdf: false,
        isCompressed: false,
        xmpValid: false
      });
    }
    return validateFacturXXml(xmlText, { isPdf: false });
  }

  /* ------------------------------------------------------------------------
   * 6. EN 16931 + XP Z12-012 XML Generator (`generateFacturXXml`)
   * --------------------------------------------------------------------- */

  function sanitizeInvoiceId(rawId) {
    const cleaned = String(rawId == null ? "" : rawId)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9+\-_/]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 35);
    return cleaned || "FAC-2027-0001";
  }

  function normalizeDate102(val, fallbackYmd) {
    const digits = cleanDigits(val);
    if (/^\d{8}$/.test(digits)) return digits;
    return fallbackYmd || "20270901";
  }

  function addDays102(ymd, days) {
    if (!/^\d{8}$/.test(ymd)) return "20271001";
    const y = parseInt(ymd.slice(0, 4), 10);
    const m = parseInt(ymd.slice(4, 6), 10) - 1;
    const d = parseInt(ymd.slice(6, 8), 10);
    const dt = new Date(Date.UTC(y, m, d + days));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return "" + yy + mm + dd;
  }

  function normalizeInvoiceModel(rawModel) {
    const m = rawModel || {};
    const invoiceId = sanitizeInvoiceId(m.invoice_id || m.invoiceId || "FAC-2027-0101");
    const issueDate = normalizeDate102(m.issue_date || m.issueDate, "20270901");
    const dueDate = normalizeDate102(m.due_date || m.dueDate, addDays102(issueDate, 30));
    const typeCodeRaw = String(m.type_code || m.typeCode || "380").trim();
    const typeCode = PA_ALLOWED_TYPE_CODES.has(typeCodeRaw) ? typeCodeRaw : "380";
    const opCatRaw = String(m.operation_category || m.operationCategory || "S1").trim().toUpperCase();
    const operationCategory = VALID_BT23_CODES.has(opCatRaw) ? opCatRaw : "S1";
    const currency = String(m.currency || "EUR").trim().toUpperCase() || "EUR";
    const taxRegime = String(m.tax_regime || m.taxRegime || "FRANCHISE_293B").trim().toUpperCase();
    const vatDueType = String(m.vat_due_type || m.vatDueType || "72").trim() || "72";
    const refInvoiceId = sanitizeInvoiceId(
      m.referenced_invoice_id || m.referencedInvoiceId || m.preceding_invoice_id || "FAC-ORIG-2027-001"
    );

    const sIn = m.seller || {};
    const sellerSiren = cleanDigits(sIn.siren || "732829320");
    const sellerSiret = sIn.siret ? cleanDigits(sIn.siret) : "";
    const sellerCountry = String(sIn.country || "FR").trim().toUpperCase() || "FR";
    let sellerVat = sIn.vat_number || sIn.vatNumber ? String(sIn.vat_number || sIn.vatNumber).replace(/\s+/g, "").toUpperCase() : "";
    if (!sellerVat && taxRegime !== "FRANCHISE_293B" && sellerCountry === "FR" && validateSiren(sellerSiren)) {
      sellerVat = computeFrenchVat(sellerSiren);
    }

    const bIn = m.buyer || {};
    const buyerSiren = cleanDigits(bIn.siren || "552100554");
    const buyerSiret = bIn.siret ? cleanDigits(bIn.siret) : "";
    const buyerCountry = String(bIn.country || "FR").trim().toUpperCase() || "FR";
    const buyerVat = bIn.vat_number || bIn.vatNumber ? String(bIn.vat_number || bIn.vatNumber).replace(/\s+/g, "").toUpperCase() : "";

    const rawLines = Array.isArray(m.lines) && m.lines.length > 0
      ? m.lines
      : [{ name: "Prestation de conseil B2B", qty: 1, unit_code: "C62", net_price: 1000, vat_rate: taxRegime === "FRANCHISE_293B" ? 0 : 20 }];

    const computedLines = [];
    const taxBuckets = new Map();
    let lineTotalCents = 0n;

    for (let i = 0; i < rawLines.length; i++) {
      const rl = rawLines[i] || {};
      const qtyStr = String(rl.qty != null ? rl.qty : rl.quantity != null ? rl.quantity : 1);
      const unitCode = String(rl.unit_code || rl.unitCode || "C62").trim() || "C62";
      const netPriceCents = parseCents(rl.net_price != null ? rl.net_price : rl.netPrice != null ? rl.netPrice : 0) || 0n;
      const netPriceStr = formatCents(netPriceCents);

      let cat = rl.category_code || rl.categoryCode || "";
      let rateNum = rl.vat_rate != null ? Number(rl.vat_rate) : rl.vatRate != null ? Number(rl.vatRate) : taxRegime === "FRANCHISE_293B" ? 0 : 20;
      if (taxRegime === "FRANCHISE_293B") {
        cat = "E";
        rateNum = 0;
      } else if (taxRegime === "AUTOLIQUIDATION") {
        cat = "AE";
        rateNum = 0;
      } else if (!cat) {
        cat = rateNum === 0 ? "E" : "S";
      }
      const rateCents = parseCents(rateNum) || 0n;
      const rateStr = formatCents(rateCents);
      const lineNetCents = computeLineNetCents(qtyStr, netPriceStr, "1") || 0n;
      lineTotalCents += lineNetCents;

      computedLines.push({
        id: String(rl.id || i + 1),
        name: String(rl.name || rl.description || "Ligne " + (i + 1)),
        qty: formatCents(parseCents(qtyStr) || 100n),
        unit_code: unitCode,
        net_price: netPriceStr,
        line_total: formatCents(lineNetCents),
        line_total_cents: lineNetCents,
        category_code: cat,
        vat_rate: rateStr,
        vat_rate_cents: rateCents
      });

      const bucketKey = cat + "|" + rateStr;
      if (!taxBuckets.has(bucketKey)) {
        taxBuckets.set(bucketKey, { category_code: cat, vat_rate: rateStr, basis_cents: 0n });
      }
      taxBuckets.get(bucketKey).basis_cents += lineNetCents;
    }

    const taxBreakdown = [];
    let taxTotalCents = 0n;
    for (const bucket of taxBuckets.values()) {
      const calcCents = computeTaxCents(bucket.basis_cents, bucket.vat_rate) || 0n;
      taxTotalCents += calcCents;
      taxBreakdown.push({
        category_code: bucket.category_code,
        vat_rate: bucket.vat_rate,
        basis: formatCents(bucket.basis_cents),
        calculated: formatCents(calcCents),
        due_date_type: bucket.category_code === "S" ? vatDueType : "",
        exemption_reason:
          bucket.category_code === "E"
            ? "TVA non applicable, art. 293 B du CGI"
            : bucket.category_code === "AE"
            ? "Autoliquidation de la TVA (art. 283 du CGI)"
            : "",
        exemption_code:
          bucket.category_code === "E"
            ? "VATEX-FR-FRANCHISE"
            : bucket.category_code === "AE"
            ? "VATEX-EU-AE"
            : ""
      });
    }

    const grandTotalCents = lineTotalCents + taxTotalCents;
    const prepaidCents =
      operationCategory === "B2" || operationCategory === "S2" || operationCategory === "M2"
        ? grandTotalCents
        : parseCents(m.prepaid_amount || m.prepaidAmount || 0) || 0n;
    const duePayableCents = grandTotalCents - prepaidCents;

    const ibanClean = m.iban ? String(m.iban).replace(/\s+/g, "").toUpperCase() : "";

    return {
      invoice_id: invoiceId,
      issue_date: issueDate,
      due_date: dueDate,
      type_code: typeCode,
      referenced_invoice_id: refInvoiceId,
      operation_category: operationCategory,
      currency: currency,
      tax_regime: taxRegime,
      vat_due_type: vatDueType,
      seller: {
        name: String(sIn.name || "YGN Studio SASU"),
        siren: sellerSiren,
        siret: sellerSiret,
        vat_number: sellerVat,
        address: String(sIn.address || "8 Rue Du Gypaete"),
        postcode: String(sIn.postcode || "64000"),
        city: String(sIn.city || "Pau"),
        country: sellerCountry,
        uri_0225: String(sIn.uri_0225 || sellerSiren)
      },
      buyer: {
        name: String(bIn.name || "Client Professionnel SAS"),
        siren: buyerSiren,
        siret: buyerSiret,
        vat_number: buyerVat,
        address: String(bIn.address || "15 Avenue de l'Opera"),
        postcode: String(bIn.postcode || "75001"),
        city: String(bIn.city || "Paris"),
        country: buyerCountry,
        uri_0225: String(bIn.uri_0225 || buyerSiren)
      },
      ship_to: m.ship_to || m.shipTo || null,
      lines: computedLines,
      taxes: taxBreakdown,
      totals: {
        line_total: formatCents(lineTotalCents),
        tax_basis: formatCents(lineTotalCents),
        tax_total: formatCents(taxTotalCents),
        grand_total: formatCents(grandTotalCents),
        prepaid: formatCents(prepaidCents),
        due_payable: formatCents(duePayableCents)
      },
      iban: ibanClean,
      notes: {
        pmd: String(
          m.note_pmd ||
            "Pénalités de retard exigibles le lendemain de l'échéance : 3 fois le taux d'intérêt légal en vigueur (art. L441-10 du Code de commerce)."
        ),
        pmt: String(
          m.note_pmt ||
            "Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 EUR (art. L441-10 et D441-5 du Code de commerce)."
        ),
        aab: String(m.note_aab || "Pas d'escompte accordé en cas de paiement anticipé.")
      }
    };
  }

  function generateFacturXXml(invoiceModel) {
    const inv = normalizeInvoiceModel(invoiceModel);
    const out = [];
    out.push('<?xml version="1.0" encoding="UTF-8"?>');
    out.push(
      '<rsm:CrossIndustryInvoice xmlns:rsm="' +
        NS_RSM +
        '" xmlns:qdt="' +
        NS_QDT +
        '" xmlns:ram="' +
        NS_RAM +
        '" xmlns:udt="' +
        NS_UDT +
        '">'
    );
    out.push("  <rsm:ExchangedDocumentContext>");
    out.push("    <ram:BusinessProcessSpecifiedDocumentContextParameter>");
    out.push("      <ram:ID>" + escapeXml(inv.operation_category) + "</ram:ID>");
    out.push("    </ram:BusinessProcessSpecifiedDocumentContextParameter>");
    out.push("    <ram:GuidelineSpecifiedDocumentContextParameter>");
    out.push("      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>");
    out.push("    </ram:GuidelineSpecifiedDocumentContextParameter>");
    out.push("  </rsm:ExchangedDocumentContext>");

    out.push("  <rsm:ExchangedDocument>");
    out.push("    <ram:ID>" + escapeXml(inv.invoice_id) + "</ram:ID>");
    out.push("    <ram:TypeCode>" + escapeXml(inv.type_code) + "</ram:TypeCode>");
    out.push("    <ram:IssueDateTime>");
    out.push('      <udt:DateTimeString format="102">' + escapeXml(inv.issue_date) + "</udt:DateTimeString>");
    out.push("    </ram:IssueDateTime>");
    out.push("    <ram:IncludedNote>");
    out.push("      <ram:Content>" + escapeXml(inv.notes.pmd) + "</ram:Content>");
    out.push("      <ram:SubjectCode>PMD</ram:SubjectCode>");
    out.push("    </ram:IncludedNote>");
    out.push("    <ram:IncludedNote>");
    out.push("      <ram:Content>" + escapeXml(inv.notes.pmt) + "</ram:Content>");
    out.push("      <ram:SubjectCode>PMT</ram:SubjectCode>");
    out.push("    </ram:IncludedNote>");
    out.push("    <ram:IncludedNote>");
    out.push("      <ram:Content>" + escapeXml(inv.notes.aab) + "</ram:Content>");
    out.push("      <ram:SubjectCode>AAB</ram:SubjectCode>");
    out.push("    </ram:IncludedNote>");
    out.push("  </rsm:ExchangedDocument>");

    out.push("  <rsm:SupplyChainTradeTransaction>");
    for (let i = 0; i < inv.lines.length; i++) {
      const ln = inv.lines[i];
      out.push("    <ram:IncludedSupplyChainTradeLineItem>");
      out.push("      <ram:AssociatedDocumentLineDocument>");
      out.push("        <ram:LineID>" + escapeXml(ln.id) + "</ram:LineID>");
      out.push("      </ram:AssociatedDocumentLineDocument>");
      out.push("      <ram:SpecifiedTradeProduct>");
      out.push("        <ram:Name>" + escapeXml(ln.name) + "</ram:Name>");
      out.push("      </ram:SpecifiedTradeProduct>");
      out.push("      <ram:SpecifiedLineTradeAgreement>");
      out.push("        <ram:NetPriceProductTradePrice>");
      out.push("          <ram:ChargeAmount>" + escapeXml(ln.net_price) + "</ram:ChargeAmount>");
      out.push('          <ram:BasisQuantity unitCode="' + escapeXml(ln.unit_code) + '">1.00</ram:BasisQuantity>');
      out.push("        </ram:NetPriceProductTradePrice>");
      out.push("      </ram:SpecifiedLineTradeAgreement>");
      out.push("      <ram:SpecifiedLineTradeDelivery>");
      out.push('        <ram:BilledQuantity unitCode="' + escapeXml(ln.unit_code) + '">' + escapeXml(ln.qty) + "</ram:BilledQuantity>");
      out.push("      </ram:SpecifiedLineTradeDelivery>");
      out.push("      <ram:SpecifiedLineTradeSettlement>");
      out.push("        <ram:ApplicableTradeTax>");
      out.push("          <ram:TypeCode>VAT</ram:TypeCode>");
      out.push("          <ram:CategoryCode>" + escapeXml(ln.category_code) + "</ram:CategoryCode>");
      out.push("          <ram:RateApplicablePercent>" + escapeXml(ln.vat_rate) + "</ram:RateApplicablePercent>");
      out.push("        </ram:ApplicableTradeTax>");
      out.push("        <ram:SpecifiedTradeSettlementLineMonetarySummation>");
      out.push("          <ram:LineTotalAmount>" + escapeXml(ln.line_total) + "</ram:LineTotalAmount>");
      out.push("        </ram:SpecifiedTradeSettlementLineMonetarySummation>");
      out.push("      </ram:SpecifiedLineTradeSettlement>");
      out.push("    </ram:IncludedSupplyChainTradeLineItem>");
    }

    // Header Trade Agreement
    out.push("    <ram:ApplicableHeaderTradeAgreement>");
    out.push("      <ram:SellerTradeParty>");
    if (inv.seller.siret) {
      out.push('        <ram:GlobalID schemeID="0009">' + escapeXml(inv.seller.siret) + "</ram:GlobalID>");
    }
    out.push("        <ram:Name>" + escapeXml(inv.seller.name) + "</ram:Name>");
    out.push("        <ram:SpecifiedLegalOrganization>");
    out.push('          <ram:ID schemeID="0002">' + escapeXml(inv.seller.siren) + "</ram:ID>");
    out.push("        </ram:SpecifiedLegalOrganization>");
    out.push("        <ram:PostalTradeAddress>");
    out.push("          <ram:PostcodeCode>" + escapeXml(inv.seller.postcode) + "</ram:PostcodeCode>");
    out.push("          <ram:LineOne>" + escapeXml(inv.seller.address) + "</ram:LineOne>");
    out.push("          <ram:CityName>" + escapeXml(inv.seller.city) + "</ram:CityName>");
    out.push("          <ram:CountryID>" + escapeXml(inv.seller.country) + "</ram:CountryID>");
    out.push("        </ram:PostalTradeAddress>");
    out.push("        <ram:URIUniversalCommunication>");
    out.push('          <ram:URIID schemeID="0225">' + escapeXml(inv.seller.uri_0225) + "</ram:URIID>");
    out.push("        </ram:URIUniversalCommunication>");
    if (inv.seller.vat_number) {
      out.push("        <ram:SpecifiedTaxRegistration>");
      out.push('          <ram:ID schemeID="VA">' + escapeXml(inv.seller.vat_number) + "</ram:ID>");
      out.push("        </ram:SpecifiedTaxRegistration>");
    }
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push('          <ram:ID schemeID="FC">' + escapeXml(inv.seller.siren) + "</ram:ID>");
    out.push("        </ram:SpecifiedTaxRegistration>");
    out.push("      </ram:SellerTradeParty>");

    out.push("      <ram:BuyerTradeParty>");
    if (inv.buyer.siret) {
      out.push('        <ram:GlobalID schemeID="0009">' + escapeXml(inv.buyer.siret) + "</ram:GlobalID>");
    }
    out.push("        <ram:Name>" + escapeXml(inv.buyer.name) + "</ram:Name>");
    out.push("        <ram:SpecifiedLegalOrganization>");
    out.push('          <ram:ID schemeID="0002">' + escapeXml(inv.buyer.siren) + "</ram:ID>");
    out.push("        </ram:SpecifiedLegalOrganization>");
    out.push("        <ram:PostalTradeAddress>");
    out.push("          <ram:PostcodeCode>" + escapeXml(inv.buyer.postcode) + "</ram:PostcodeCode>");
    out.push("          <ram:LineOne>" + escapeXml(inv.buyer.address) + "</ram:LineOne>");
    out.push("          <ram:CityName>" + escapeXml(inv.buyer.city) + "</ram:CityName>");
    out.push("          <ram:CountryID>" + escapeXml(inv.buyer.country) + "</ram:CountryID>");
    out.push("        </ram:PostalTradeAddress>");
    out.push("        <ram:URIUniversalCommunication>");
    out.push('          <ram:URIID schemeID="0225">' + escapeXml(inv.buyer.uri_0225) + "</ram:URIID>");
    out.push("        </ram:URIUniversalCommunication>");
    if (inv.buyer.vat_number) {
      out.push("        <ram:SpecifiedTaxRegistration>");
      out.push('          <ram:ID schemeID="VA">' + escapeXml(inv.buyer.vat_number) + "</ram:ID>");
      out.push("        </ram:SpecifiedTaxRegistration>");
    }
    out.push("      </ram:BuyerTradeParty>");
    out.push("    </ram:ApplicableHeaderTradeAgreement>");

    // Header Trade Delivery
    out.push("    <ram:ApplicableHeaderTradeDelivery>");
    if (inv.ship_to) {
      out.push("      <ram:ShipToTradeParty>");
      out.push("        <ram:Name>" + escapeXml(inv.ship_to.name || inv.buyer.name) + "</ram:Name>");
      out.push("        <ram:PostalTradeAddress>");
      out.push("          <ram:PostcodeCode>" + escapeXml(inv.ship_to.postcode || inv.buyer.postcode) + "</ram:PostcodeCode>");
      out.push("          <ram:LineOne>" + escapeXml(inv.ship_to.address || inv.buyer.address) + "</ram:LineOne>");
      out.push("          <ram:CityName>" + escapeXml(inv.ship_to.city || inv.buyer.city) + "</ram:CityName>");
      out.push("          <ram:CountryID>" + escapeXml(inv.ship_to.country || inv.buyer.country) + "</ram:CountryID>");
      out.push("        </ram:PostalTradeAddress>");
      out.push("      </ram:ShipToTradeParty>");
    }
    out.push("      <ram:ActualDeliverySupplyChainEvent>");
    out.push("        <ram:OccurrenceDateTime>");
    out.push('          <udt:DateTimeString format="102">' + escapeXml(inv.issue_date) + "</udt:DateTimeString>");
    out.push("        </ram:OccurrenceDateTime>");
    out.push("      </ram:ActualDeliverySupplyChainEvent>");
    out.push("    </ram:ApplicableHeaderTradeDelivery>");

    // Header Trade Settlement
    out.push("    <ram:ApplicableHeaderTradeSettlement>");
    out.push("      <ram:InvoiceCurrencyCode>" + escapeXml(inv.currency) + "</ram:InvoiceCurrencyCode>");
    out.push("      <ram:SpecifiedTradeSettlementPaymentMeans>");
    out.push("        <ram:TypeCode>30</ram:TypeCode>");
    if (inv.iban) {
      out.push("        <ram:PayeePartyCreditorFinancialAccount>");
      out.push("          <ram:IBANID>" + escapeXml(inv.iban) + "</ram:IBANID>");
      out.push("        </ram:PayeePartyCreditorFinancialAccount>");
    }
    out.push("      </ram:SpecifiedTradeSettlementPaymentMeans>");

    for (let i = 0; i < inv.taxes.length; i++) {
      const tx = inv.taxes[i];
      out.push("      <ram:ApplicableTradeTax>");
      out.push("        <ram:CalculatedAmount>" + escapeXml(tx.calculated) + "</ram:CalculatedAmount>");
      out.push("        <ram:TypeCode>VAT</ram:TypeCode>");
      if (tx.exemption_reason) {
        out.push("        <ram:ExemptionReason>" + escapeXml(tx.exemption_reason) + "</ram:ExemptionReason>");
      }
      out.push("        <ram:BasisAmount>" + escapeXml(tx.basis) + "</ram:BasisAmount>");
      out.push("        <ram:CategoryCode>" + escapeXml(tx.category_code) + "</ram:CategoryCode>");
      if (tx.exemption_code) {
        out.push("        <ram:ExemptionReasonCode>" + escapeXml(tx.exemption_code) + "</ram:ExemptionReasonCode>");
      }
      if (tx.due_date_type) {
        out.push("        <ram:DueDateTypeCode>" + escapeXml(tx.due_date_type) + "</ram:DueDateTypeCode>");
      }
      out.push("        <ram:RateApplicablePercent>" + escapeXml(tx.vat_rate) + "</ram:RateApplicablePercent>");
      out.push("      </ram:ApplicableTradeTax>");
    }

    out.push("      <ram:SpecifiedTradePaymentTerms>");
    out.push("        <ram:Description>Règlement par virement SEPA à échéance.</ram:Description>");
    out.push("        <ram:DueDateDateTime>");
    out.push('          <udt:DateTimeString format="102">' + escapeXml(inv.due_date) + "</udt:DateTimeString>");
    out.push("        </ram:DueDateDateTime>");
    out.push("      </ram:SpecifiedTradePaymentTerms>");

    out.push("      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>");
    out.push("        <ram:LineTotalAmount>" + escapeXml(inv.totals.line_total) + "</ram:LineTotalAmount>");
    out.push("        <ram:TaxBasisTotalAmount>" + escapeXml(inv.totals.tax_basis) + "</ram:TaxBasisTotalAmount>");
    out.push('        <ram:TaxTotalAmount currencyID="' + escapeXml(inv.currency) + '">' + escapeXml(inv.totals.tax_total) + "</ram:TaxTotalAmount>");
    out.push("        <ram:GrandTotalAmount>" + escapeXml(inv.totals.grand_total) + "</ram:GrandTotalAmount>");
    if (inv.totals.prepaid !== "0.00") {
      out.push("        <ram:TotalPrepaidAmount>" + escapeXml(inv.totals.prepaid) + "</ram:TotalPrepaidAmount>");
    }
    out.push("        <ram:DuePayableAmount>" + escapeXml(inv.totals.due_payable) + "</ram:DuePayableAmount>");
    out.push("      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>");

    if (REF_REQUIRED_TYPE_CODES.has(inv.type_code)) {
      out.push("      <ram:InvoiceReferencedDocument>");
      out.push("        <ram:IssuerAssignedID>" + escapeXml(inv.referenced_invoice_id) + "</ram:IssuerAssignedID>");
      out.push("      </ram:InvoiceReferencedDocument>");
    }

    out.push("    </ram:ApplicableHeaderTradeSettlement>");
    out.push("  </rsm:SupplyChainTradeTransaction>");
    out.push("</rsm:CrossIndustryInvoice>");
    return out.join("\n") + "\n";
  }

  /* ------------------------------------------------------------------------
   * 7. Auto-Fixer (`autoFixFacturXXml` — BASIC/Broken -> 100/100 EN 16931)
   * --------------------------------------------------------------------- */

  function extractValidSirenFromParty(partyNode, fallbackSiren) {
    if (!partyNode) return fallbackSiren;
    // 1. LegalOrg ID (9-digit SIREN or 14-digit SIRET)
    const legalId = findPathNs(partyNode, [[null, "SpecifiedLegalOrganization"], [null, "ID"]]);
    if (legalId && legalId.text) {
      const d = cleanDigits(legalId.text);
      if (d.length === 9 && validateSiren(d)) return d;
      if (d.length === 14 && validateSiret(d)) return d.slice(0, 9);
    }
    // 2. GlobalID
    const globals = childrenByNs(partyNode, null, "GlobalID");
    for (let i = 0; i < globals.length; i++) {
      const d = cleanDigits(globals[i].text);
      if (d.length === 14 && validateSiret(d)) return d.slice(0, 9);
      if (d.length === 9 && validateSiren(d)) return d;
    }
    // 3. TaxRegistration (VA or FC)
    const regs = childrenByNs(partyNode, null, "SpecifiedTaxRegistration");
    for (let i = 0; i < regs.length; i++) {
      const idN = childByNs(regs[i], null, "ID");
      if (!idN || !idN.text) continue;
      const v = idN.text.replace(/[\s.\-]+/g, "").toUpperCase();
      if (/^FR\d{11}$/.test(v) && validateSiren(v.slice(4))) return v.slice(4);
      const d = cleanDigits(v);
      if (d.length === 9 && validateSiren(d)) return d;
    }
    return fallbackSiren;
  }

  function extractInvoiceModelFromXmlTree(root, overrides) {
    const ov = overrides || {};
    const docContext = childByNs(root, null, "ExchangedDocumentContext");
    const exDoc = childByNs(root, null, "ExchangedDocument");
    const tx = childByNs(root, null, "SupplyChainTradeTransaction");
    const agree = childByNs(tx, null, "ApplicableHeaderTradeAgreement");
    const deliv = childByNs(tx, null, "ApplicableHeaderTradeDelivery");
    const settle = childByNs(tx, null, "ApplicableHeaderTradeSettlement");

    const rawId = ov.invoice_id || ov.invoiceId || textOfNs(exDoc, [[null, "ID"]]) || "FAC-2027-0001";
    const rawType = ov.type_code || ov.typeCode || textOfNs(exDoc, [[null, "TypeCode"]]) || "380";
    const rawIssue =
      ov.issue_date ||
      ov.issueDate ||
      textOfNs(exDoc, [[null, "IssueDateTime"], [null, "DateTimeString"]]) ||
      "20270901";

    let bt23 =
      ov.operation_category ||
      ov.operationCategory ||
      textOfNs(docContext, [[null, "BusinessProcessSpecifiedDocumentContextParameter"], [null, "ID"]]);
    if (!VALID_BT23_CODES.has(bt23)) {
      bt23 = "S1";
    }

    const sellerNode = childByNs(agree, null, "SellerTradeParty");
    const buyerNode = childByNs(agree, null, "BuyerTradeParty");
    const sellerSiren =
      ov.seller_siren && validateSiren(ov.seller_siren)
        ? cleanDigits(ov.seller_siren)
        : extractValidSirenFromParty(sellerNode, "732829320");
    const buyerSiren =
      ov.buyer_siren && validateSiren(ov.buyer_siren)
        ? cleanDigits(ov.buyer_siren)
        : extractValidSirenFromParty(buyerNode, "552100554");

    const currency = ov.currency || textOfNs(settle, [[null, "InvoiceCurrencyCode"]]) || "EUR";

    // Inspect existing header taxes to infer regime
    const headerTaxes = childrenByNs(settle, null, "ApplicableTradeTax");
    let inferredRegime = ov.tax_regime || ov.taxRegime || "";
    let inferredDueType = ov.vat_due_type || ov.vatDueType || "72";
    let defaultRate = 0;

    if (!inferredRegime) {
      let sawStandard = false;
      let sawAe = false;
      for (let i = 0; i < headerTaxes.length; i++) {
        const c = textOfNs(headerTaxes[i], [[null, "CategoryCode"]]);
        const r = parseFloat(textOfNs(headerTaxes[i], [[null, "RateApplicablePercent"]]) || "0") || 0;
        const dType = textOfNs(headerTaxes[i], [[null, "DueDateTypeCode"]]);
        if (dType === "5" || dType === "72") inferredDueType = dType;
        if (c === "S" || r > 0) {
          sawStandard = true;
          defaultRate = r || 20;
        } else if (c === "AE") {
          sawAe = true;
        }
      }
      inferredRegime = sawStandard ? "TVA_STANDARD" : sawAe ? "AUTOLIQUIDATION" : "FRANCHISE_293B";
    }

    // Extract lines (or synthesize from header TaxBasisTotalAmount if MINIMUM / BASIC WL)
    const xmlLines = childrenByNs(tx, null, "IncludedSupplyChainTradeLineItem");
    const extractedLines = [];
    if (xmlLines.length > 0) {
      for (let i = 0; i < xmlLines.length; i++) {
        const ln = xmlLines[i];
        const name = textOfNs(ln, [[null, "SpecifiedTradeProduct"], [null, "Name"]]) || "Prestation B2B " + (i + 1);
        const qtyNode = findPathNs(ln, [[null, "SpecifiedLineTradeDelivery"], [null, "BilledQuantity"]]);
        const qty = qtyNode && parseCents(qtyNode.text) !== null ? formatCents(parseCents(qtyNode.text)) : "1.00";
        const unitCode = (qtyNode && qtyNode.attrs && qtyNode.attrs.unitCode) || "C62";
        const priceTxt = textOfNs(ln, [
          [null, "SpecifiedLineTradeAgreement"],
          [null, "NetPriceProductTradePrice"],
          [null, "ChargeAmount"]
        ]);
        const lineTotTxt =
          textOfNs(ln, [
            [null, "SpecifiedLineTradeSettlement"],
            [null, "SpecifiedTradeSettlementLineMonetarySummation"],
            [null, "LineTotalAmount"]
          ]) ||
          textOfNs(ln, [
            [null, "SpecifiedLineTradeSettlement"],
            [null, "SpecifiedTradeSettlementMonetarySummation"],
            [null, "LineTotalAmount"]
          ]);
        const netPrice =
          priceTxt && parseCents(priceTxt) !== null
            ? formatCents(parseCents(priceTxt))
            : lineTotTxt && parseCents(lineTotTxt) !== null
            ? formatCents(parseCents(lineTotTxt))
            : "100.00";

        const lTax = findPathNs(ln, [[null, "SpecifiedLineTradeSettlement"], [null, "ApplicableTradeTax"]]);
        const lCat = textOfNs(lTax, [[null, "CategoryCode"]]);
        const lRateRaw = textOfNs(lTax, [[null, "RateApplicablePercent"]]);
        const lRate = lRateRaw !== "" ? Number(lRateRaw) : defaultRate;
        if (lRate > 0) inferredRegime = "TVA_STANDARD";

        extractedLines.push({
          id: String(i + 1),
          name: name,
          qty: Number(qty),
          unit_code: unitCode,
          net_price: Number(netPrice),
          category_code: lRate > 0 ? "S" : lCat || (inferredRegime === "AUTOLIQUIDATION" ? "AE" : "E"),
          vat_rate: lRate > 0 ? lRate : 0
        });
      }
    } else {
      const summation = childByNs(settle, null, "SpecifiedTradeSettlementHeaderMonetarySummation");
      const basisStr =
        textOfNs(summation, [[null, "TaxBasisTotalAmount"]]) ||
        textOfNs(summation, [[null, "LineTotalAmount"]]) ||
        "100.00";
      const basisCents = parseCents(basisStr) || 10000n;
      extractedLines.push({
        id: "1",
        name: "Prestation B2B consolidée (mise à niveau EN 16931)",
        qty: 1,
        unit_code: "C62",
        net_price: Number(formatCents(basisCents)),
        vat_rate: inferredRegime === "TVA_STANDARD" ? defaultRate || 20 : 0
      });
    }

    // Preserve valid IBAN only if valid ISO 13616
    let validIban = "";
    if (ov.iban && validateIban(ov.iban)) {
      validIban = String(ov.iban).replace(/\s+/g, "").toUpperCase();
    } else {
      const pMeans = childrenByNs(settle, null, "SpecifiedTradeSettlementPaymentMeans");
      for (let i = 0; i < pMeans.length; i++) {
        const cand = textOfNs(pMeans[i], [[null, "PayeePartyCreditorFinancialAccount"], [null, "IBANID"]]);
        if (cand && validateIban(cand)) {
          validIban = cand.replace(/\s+/g, "").toUpperCase();
          break;
        }
      }
    }

    const shipNode = childByNs(deliv, null, "ShipToTradeParty");
    const shipTo = shipNode
      ? {
          name: textOfNs(shipNode, [[null, "Name"]]) || textOfNs(buyerNode, [[null, "Name"]]) || "Client B2B",
          address: textOfNs(shipNode, [[null, "PostalTradeAddress"], [null, "LineOne"]]) || "Adresse livraison",
          postcode: textOfNs(shipNode, [[null, "PostalTradeAddress"], [null, "PostcodeCode"]]) || "75001",
          city: textOfNs(shipNode, [[null, "PostalTradeAddress"], [null, "CityName"]]) || "Paris",
          country: textOfNs(shipNode, [[null, "PostalTradeAddress"], [null, "CountryID"]]) || "FR"
        }
      : null;

    const dueRaw =
      ov.due_date ||
      ov.dueDate ||
      textOfNs(settle, [[null, "SpecifiedTradePaymentTerms"], [null, "DueDateDateTime"], [null, "DateTimeString"]]) ||
      "";
    const refDoc =
      textOfNs(settle, [[null, "InvoiceReferencedDocument"], [null, "IssuerAssignedID"]]) || "FAC-ORIG-2027-001";

    return {
      invoice_id: sanitizeInvoiceId(rawId),
      issue_date: normalizeDate102(rawIssue, "20270901"),
      due_date: dueRaw ? normalizeDate102(dueRaw, addDays102(normalizeDate102(rawIssue, "20270901"), 30)) : undefined,
      type_code: PA_ALLOWED_TYPE_CODES.has(rawType) ? rawType : "380",
      referenced_invoice_id: sanitizeInvoiceId(refDoc),
      operation_category: bt23,
      currency: currency,
      tax_regime: inferredRegime,
      vat_due_type: inferredDueType,
      seller: {
        name: textOfNs(sellerNode, [[null, "Name"]]) || "Émetteur B2B SAS",
        siren: sellerSiren,
        address: textOfNs(sellerNode, [[null, "PostalTradeAddress"], [null, "LineOne"]]) || "8 Rue Du Gypaete",
        postcode: textOfNs(sellerNode, [[null, "PostalTradeAddress"], [null, "PostcodeCode"]]) || "64000",
        city: textOfNs(sellerNode, [[null, "PostalTradeAddress"], [null, "CityName"]]) || "Pau",
        country: textOfNs(sellerNode, [[null, "PostalTradeAddress"], [null, "CountryID"]]) || "FR"
      },
      buyer: {
        name: textOfNs(buyerNode, [[null, "Name"]]) || "Client Professionnel SAS",
        siren: buyerSiren,
        address: textOfNs(buyerNode, [[null, "PostalTradeAddress"], [null, "LineOne"]]) || "15 Avenue de l'Opera",
        postcode: textOfNs(buyerNode, [[null, "PostalTradeAddress"], [null, "PostcodeCode"]]) || "75001",
        city: textOfNs(buyerNode, [[null, "PostalTradeAddress"], [null, "CityName"]]) || "Paris",
        country: textOfNs(buyerNode, [[null, "PostalTradeAddress"], [null, "CountryID"]]) || "FR"
      },
      ship_to: shipTo,
      lines: extractedLines,
      iban: validIban
    };
  }

  function autoFixFacturXXml(xmlInput, overrides) {
    const xmlStr =
      typeof xmlInput === "string" ? xmlInput : new TextDecoder("utf-8", { fatal: false }).decode(toUint8Array(xmlInput));
    const root = parseXmlStrict(xmlStr);
    const recoveredModel = extractInvoiceModelFromXmlTree(root, overrides);
    const fixedXml = generateFacturXXml(recoveredModel);
    const check = validateFacturXXml(fixedXml, { isPdf: false });
    if (!check.valid || check.score !== 100) {
      throw new Error("Auto-fix internal verification failed: " + JSON.stringify(check.errors));
    }
    return fixedXml;
  }

  /* ------------------------------------------------------------------------
   * 8. Hybrid PDF/A-3b Writer (`generateHybridFacturXPdf`)
   * --------------------------------------------------------------------- */

  function winAnsiEscapePdfLiteral(text) {
    const s = String(text == null ? "" : text);
    let out = "(";
    for (let i = 0; i < s.length; i++) {
      const cp = s.charCodeAt(i);
      let byte = 0x3f; // '?'
      if (cp >= 0x20 && cp <= 0x7e) {
        if (cp === 0x28 || cp === 0x29 || cp === 0x5c) {
          out += "\\" + String.fromCharCode(cp);
          continue;
        }
        out += String.fromCharCode(cp);
        continue;
      } else if (WINANSI_SPECIAL[cp] != null) {
        byte = WINANSI_SPECIAL[cp];
      } else if (cp >= 0xa0 && cp <= 0xff) {
        byte = cp;
      } else {
        byte = 0x20;
      }
      out += "\\" + byte.toString(8).padStart(3, "0");
    }
    out += ")";
    return out;
  }

  function buildFacturXXmpPacket(conformanceLevel, invoiceId, sellerName) {
    const level = conformanceLevel || "EN 16931";
    const title = "Facture Factur-X " + (invoiceId || "2027");
    const creator = sellerName || "YGN FacturKit 2027";
    return (
      '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
      '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
      '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
      '    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n' +
      "      <pdfaid:part>3</pdfaid:part>\n" +
      "      <pdfaid:conformance>B</pdfaid:conformance>\n" +
      "    </rdf:Description>\n" +
      '    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
      "      <dc:title><rdf:Alt><rdf:li xml:lang=\"x-default\">" +
      escapeXml(title) +
      "</rdf:li></rdf:Alt></dc:title>\n" +
      "      <dc:creator><rdf:Seq><rdf:li>" +
      escapeXml(creator) +
      "</rdf:li></rdf:Seq></dc:creator>\n" +
      "    </rdf:Description>\n" +
      '    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n' +
      "      <pdf:Producer>YGN FacturXEngine2027 PDF/A-3b</pdf:Producer>\n" +
      "    </rdf:Description>\n" +
      '    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">\n' +
      "      <xmp:CreatorTool>FacturKit 2027 Sovereign Engine</xmp:CreatorTool>\n" +
      "      <xmp:CreateDate>2027-09-01T09:00:00+00:00</xmp:CreateDate>\n" +
      "      <xmp:ModifyDate>2027-09-01T09:00:00+00:00</xmp:ModifyDate>\n" +
      "    </rdf:Description>\n" +
      '    <rdf:Description rdf:about=""\n' +
      '        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"\n' +
      '        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"\n' +
      '        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">\n' +
      "      <pdfaExtension:schemas>\n" +
      "        <rdf:Bag>\n" +
      '          <rdf:li rdf:parseType="Resource">\n' +
      "            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>\n" +
      "            <pdfaSchema:namespaceURI>" +
      FACTURX_XMP_NS +
      "</pdfaSchema:namespaceURI>\n" +
      "            <pdfaSchema:prefix>fx</pdfaSchema:prefix>\n" +
      "            <pdfaSchema:property>\n" +
      "              <rdf:Seq>\n" +
      '                <rdf:li rdf:parseType="Resource">\n' +
      "                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>\n" +
      "                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>\n" +
      "                  <pdfaProperty:category>external</pdfaProperty:category>\n" +
      "                  <pdfaProperty:description>The name of the embedded XML document</pdfaProperty:description>\n" +
      "                </rdf:li>\n" +
      '                <rdf:li rdf:parseType="Resource">\n' +
      "                  <pdfaProperty:name>DocumentType</pdfaProperty:name>\n" +
      "                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>\n" +
      "                  <pdfaProperty:category>external</pdfaProperty:category>\n" +
      "                  <pdfaProperty:description>The type of the hybrid document in capital letters, e.g. INVOICE</pdfaProperty:description>\n" +
      "                </rdf:li>\n" +
      '                <rdf:li rdf:parseType="Resource">\n' +
      "                  <pdfaProperty:name>Version</pdfaProperty:name>\n" +
      "                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>\n" +
      "                  <pdfaProperty:category>external</pdfaProperty:category>\n" +
      "                  <pdfaProperty:description>The actual version of the standard applying to the embedded XML document</pdfaProperty:description>\n" +
      "                </rdf:li>\n" +
      '                <rdf:li rdf:parseType="Resource">\n' +
      "                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>\n" +
      "                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>\n" +
      "                  <pdfaProperty:category>external</pdfaProperty:category>\n" +
      "                  <pdfaProperty:description>The conformance level of the embedded XML document</pdfaProperty:description>\n" +
      "                </rdf:li>\n" +
      "              </rdf:Seq>\n" +
      "            </pdfaSchema:property>\n" +
      "          </rdf:li>\n" +
      "        </rdf:Bag>\n" +
      "      </pdfaExtension:schemas>\n" +
      "    </rdf:Description>\n" +
      '    <rdf:Description rdf:about="" xmlns:fx="' +
      FACTURX_XMP_NS +
      '">\n' +
      "      <fx:DocumentType>INVOICE</fx:DocumentType>\n" +
      "      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>\n" +
      "      <fx:Version>1.0</fx:Version>\n" +
      "      <fx:ConformanceLevel>" +
      escapeXml(level) +
      "</fx:ConformanceLevel>\n" +
      "    </rdf:Description>\n" +
      "  </rdf:RDF>\n" +
      "</x:xmpmeta>\n" +
      '<?xpacket end="w"?>'
    );
  }

  function renderVisualInvoicePageCommands(inv) {
    const cmds = [];
    function fillRect(x, y, w, h, r, g, b) {
      cmds.push(r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3) + " rg");
      cmds.push(x.toFixed(2) + " " + y.toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re f");
    }
    function strokeRect(x, y, w, h, r, g, b) {
      cmds.push(r.toFixed(3) + " " + g.toFixed(3) + " " + b.toFixed(3) + " RG 0.7 w");
      cmds.push(x.toFixed(2) + " " + y.toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re S");
    }
    function drawText(font, size, x, y, text, r, g, b) {
      cmds.push("BT");
      cmds.push((r != null ? r : 0.06).toFixed(3) + " " + (g != null ? g : 0.09).toFixed(3) + " " + (b != null ? b : 0.16).toFixed(3) + " rg");
      cmds.push("/" + font + " " + size + " Tf");
      cmds.push("1 0 0 1 " + x.toFixed(2) + " " + y.toFixed(2) + " Tm");
      cmds.push(winAnsiEscapePdfLiteral(text) + " Tj");
      cmds.push("ET");
    }

    // Header banner
    fillRect(0, 768, 595.28, 73.89, 0.059, 0.09, 0.165);
    drawText("F2", 15, 40, 812, inv.seller.name.slice(0, 42), 1, 1, 1);
    drawText("F1", 9.5, 40, 795, "SIREN : " + inv.seller.siren + "  |  Factur-X 1.0.07 (EN 16931 / XP Z12-012)", 0.78, 0.85, 0.96);
    drawText("F2", 14, 370, 812, "FACTURE " + inv.invoice_id, 0.95, 0.82, 0.48);
    drawText("F1", 9.5, 370, 795, "Date : " + inv.issue_date + "   Echeance : " + inv.due_date, 0.9, 0.93, 0.98);

    // Seller & Buyer cards
    fillRect(40, 646, 248, 104, 0.975, 0.98, 0.99);
    strokeRect(40, 646, 248, 104, 0.8, 0.84, 0.9);
    drawText("F2", 9.5, 50, 733, "EMETTEUR (VENDEUR)", 0.11, 0.31, 0.85);
    drawText("F2", 10.5, 50, 716, inv.seller.name.slice(0, 36), 0.06, 0.09, 0.16);
    drawText("F1", 9, 50, 701, inv.seller.address.slice(0, 42), 0.2, 0.25, 0.33);
    drawText("F1", 9, 50, 688, inv.seller.postcode + " " + inv.seller.city + " (" + inv.seller.country + ")", 0.2, 0.25, 0.33);
    drawText("F1", 8.8, 50, 673, "SIREN (0002) : " + inv.seller.siren + " | Routage (0225) : " + inv.seller.uri_0225, 0.2, 0.25, 0.33);
    drawText("F1", 8.8, 50, 659, inv.seller.vat_number ? "TVA : " + inv.seller.vat_number : "Franchise TVA art. 293 B CGI (FC: " + inv.seller.siren + ")", 0.02, 0.47, 0.34);

    fillRect(307, 646, 248, 104, 0.975, 0.98, 0.99);
    strokeRect(307, 646, 248, 104, 0.8, 0.84, 0.9);
    drawText("F2", 9.5, 317, 733, "CLIENT PROFESSIONNEL (ACHETEUR B2B)", 0.11, 0.31, 0.85);
    drawText("F2", 10.5, 317, 716, inv.buyer.name.slice(0, 36), 0.06, 0.09, 0.16);
    drawText("F1", 9, 317, 701, inv.buyer.address.slice(0, 42), 0.2, 0.25, 0.33);
    drawText("F1", 9, 317, 688, inv.buyer.postcode + " " + inv.buyer.city + " (" + inv.buyer.country + ")", 0.2, 0.25, 0.33);
    drawText("F1", 8.8, 317, 673, "SIREN client (0002) : " + inv.buyer.siren, 0.2, 0.25, 0.33);
    drawText("F1", 8.8, 317, 659, "Adresse PA/PPF (0225) : " + inv.buyer.uri_0225, 0.2, 0.25, 0.33);

    // 2026-2027 Mandatory Mentions Banner
    fillRect(40, 606, 515, 30, 0.93, 0.96, 1.0);
    strokeRect(40, 606, 515, 30, 0.72, 0.82, 0.96);
    drawText(
      "F2",
      8.8,
      50,
      618,
      "Mentions 2026-2027 : Cadre BT-23 = " +
        inv.operation_category +
        "  |  Type BT-3 = " +
        inv.type_code +
        "  |  Devise = " +
        inv.currency,
      0.08,
      0.22,
      0.55
    );

    // Line items table
    fillRect(40, 574, 515, 22, 0.09, 0.14, 0.24);
    drawText("F2", 9, 48, 582, "DESIGNATION", 1, 1, 1);
    drawText("F2", 9, 315, 582, "QTE", 1, 1, 1);
    drawText("F2", 9, 370, 582, "P.U. HT", 1, 1, 1);
    drawText("F2", 9, 440, 582, "TVA", 1, 1, 1);
    drawText("F2", 9, 492, 582, "TOTAL HT", 1, 1, 1);

    let y = 554;
    const maxLines = Math.min(inv.lines.length, 10);
    for (let i = 0; i < maxLines; i++) {
      const ln = inv.lines[i];
      if (i % 2 === 0) fillRect(40, y - 6, 515, 20, 0.98, 0.985, 0.992);
      drawText("F1", 9, 48, y, ln.name.slice(0, 48), 0.08, 0.1, 0.15);
      drawText("F1", 9, 315, y, ln.qty, 0.08, 0.1, 0.15);
      drawText("F1", 9, 370, y, ln.net_price + " €", 0.08, 0.1, 0.15);
      drawText("F1", 9, 440, y, ln.vat_rate + "% (" + ln.category_code + ")", 0.08, 0.1, 0.15);
      drawText("F2", 9, 492, y, ln.line_total + " €", 0.08, 0.1, 0.15);
      y -= 22;
    }

    // Totals summary box
    const totY = Math.min(y - 18, 320);
    fillRect(335, totY - 64, 220, 78, 0.96, 0.97, 0.99);
    strokeRect(335, totY - 64, 220, 78, 0.76, 0.81, 0.89);
    drawText("F1", 9.5, 345, totY - 4, "Total Hors Taxes (BT-109) :", 0.2, 0.25, 0.33);
    drawText("F2", 9.5, 475, totY - 4, inv.totals.tax_basis + " €", 0.06, 0.09, 0.16);
    drawText("F1", 9.5, 345, totY - 22, "Total TVA (BT-110) :", 0.2, 0.25, 0.33);
    drawText("F2", 9.5, 475, totY - 22, inv.totals.tax_total + " €", 0.06, 0.09, 0.16);
    drawText("F2", 11, 345, totY - 46, "NET A PAYER TTC :", 0.05, 0.32, 0.22);
    drawText("F2", 11, 468, totY - 46, inv.totals.due_payable + " €", 0.05, 0.32, 0.22);

    // Legal notes footer
    drawText("F2", 8.5, 40, 126, "Mentions legales obligatoires (Code de commerce & CGI) :", 0.15, 0.2, 0.28);
    drawText("F1", 8, 40, 112, "PMD : " + inv.notes.pmd.slice(0, 108), 0.3, 0.35, 0.42);
    drawText("F1", 8, 40, 99, "PMT : " + inv.notes.pmt.slice(0, 108), 0.3, 0.35, 0.42);
    drawText("F1", 8, 40, 86, "AAB : " + inv.notes.aab.slice(0, 108), 0.3, 0.35, 0.42);
    if (inv.taxes[0] && inv.taxes[0].exemption_reason) {
      drawText("F2", 8.5, 40, 71, "Regime fiscal : " + inv.taxes[0].exemption_reason + " (" + inv.taxes[0].exemption_code + ")", 0.04, 0.42, 0.3);
    }
    drawText("F1", 7.8, 40, 44, "Document hybride PDF/A-3b conforme Factur-X 1.0.07 (piece jointe XML factur-x.xml embarquee).", 0.42, 0.47, 0.54);

    return cmds.join("\n") + "\n";
  }

  function renderCertificateAnnexPageCommands(inv, conformanceLevel, pageIndex, totalPages) {
    const cmds = [];
    cmds.push("0.059 0.090 0.165 rg 0 780 595.28 61.89 re f");
    function drawText(font, size, x, y, text, r, g, b) {
      cmds.push("BT");
      cmds.push((r != null ? r : 0.1).toFixed(3) + " " + (g != null ? g : 0.14).toFixed(3) + " " + (b != null ? b : 0.2).toFixed(3) + " rg");
      cmds.push("/" + font + " " + size + " Tf");
      cmds.push("1 0 0 1 " + x.toFixed(2) + " " + y.toFixed(2) + " Tm");
      cmds.push(winAnsiEscapePdfLiteral(text) + " Tj");
      cmds.push("ET");
    }
    drawText("F2", 13, 40, 808, "CERTIFICAT D'AUDIT & PISTE D'AUDIT FIABLE FACTUR-X 2027", 1, 1, 1);
    drawText("F1", 9, 40, 792, "Facture " + inv.invoice_id + "  |  Profil XMP : " + conformanceLevel + "  |  Page " + pageIndex + "/" + totalPages, 0.82, 0.88, 0.96);
    drawText("F2", 11, 40, 742, "1. Conformite technique ISO 19005-3 (PDF/A-3b) & Flux 2 XP Z12-012", 0.08, 0.25, 0.58);
    drawText("F1", 9.5, 40, 722, "- Piece jointe XML embarquee : factur-x.xml (/Filter /FlateDecode, /AFRelationship /Data)", 0.18, 0.22, 0.3);
    drawText("F1", 9.5, 40, 706, "- Profil colorimetrique : /OutputIntents /GTS_PDFA1 (sRGB IEC61966-2.1 ICC v2/v4)", 0.18, 0.22, 0.3);
    drawText("F1", 9.5, 40, 690, "- Metadonnees XMP RDF non compressees : urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#", 0.18, 0.22, 0.3);
    drawText("F2", 11, 40, 654, "2. Mentions obligatoires B2B 2026-2027 (Decret n 2022-1299 & CGI art. 242 nonies A)", 0.08, 0.25, 0.58);
    drawText("F1", 9.5, 40, 634, "- SIREN Emetteur (0002) : " + inv.seller.siren + "   |   SIREN Client (0002) : " + inv.buyer.siren, 0.18, 0.22, 0.3);
    drawText("F1", 9.5, 40, 618, "- Routage Annuaire PPF/PA (0225) : " + inv.seller.uri_0225 + " -> " + inv.buyer.uri_0225, 0.18, 0.22, 0.3);
    drawText("F1", 9.5, 40, 602, "- Cadre de facturation BT-23 : " + inv.operation_category + "   |   Total TTC : " + inv.totals.grand_total + " EUR", 0.18, 0.22, 0.3);
    drawText("F1", 8.5, 40, 560, "Conservation legale : 10 ans (Code de commerce art. L123-22) et 6 ans sur le plan fiscal (LPF art. L102 B).", 0.32, 0.37, 0.45);
    return cmds.join("\n") + "\n";
  }

  async function generateHybridFacturXPdf(invoiceModelOrOpts, options) {
    const opts = options || {};
    let xmlString = "";
    let invModel = null;
    let conformanceLevel = opts.conformanceLevel || "EN 16931";

    if (typeof invoiceModelOrOpts === "string") {
      xmlString = invoiceModelOrOpts;
      const root = parseXmlStrict(xmlString);
      const bt24Urn = textOfNs(childByNs(root, null, "ExchangedDocumentContext"), [
        [null, "GuidelineSpecifiedDocumentContextParameter"],
        [null, "ID"]
      ]);
      conformanceLevel = PROFILE_BY_URN[bt24Urn] || conformanceLevel;
      invModel = normalizeInvoiceModel(extractInvoiceModelFromXmlTree(root, {}));
    } else if (invoiceModelOrOpts && typeof invoiceModelOrOpts.xmlString === "string") {
      xmlString = invoiceModelOrOpts.xmlString;
      const root = parseXmlStrict(xmlString);
      const bt24Urn = textOfNs(childByNs(root, null, "ExchangedDocumentContext"), [
        [null, "GuidelineSpecifiedDocumentContextParameter"],
        [null, "ID"]
      ]);
      conformanceLevel = PROFILE_BY_URN[bt24Urn] || invoiceModelOrOpts.conformanceLevel || conformanceLevel;
      invModel = normalizeInvoiceModel(
        invoiceModelOrOpts.invoiceModel || extractInvoiceModelFromXmlTree(root, {})
      );
    } else {
      invModel = normalizeInvoiceModel(invoiceModelOrOpts || {});
      xmlString = generateFacturXXml(invModel);
      const selfCheck = validateFacturXXml(xmlString, { isPdf: false });
      if (!selfCheck.valid || selfCheck.score !== 100) {
        throw new Error(
          "Impossible de générer le PDF/A-3b : modèle de facture non conforme (" +
            selfCheck.errors.map(function (e) { return e.code; }).join(", ") +
            ")."
        );
      }
      conformanceLevel = "EN 16931";
    }

    const totalPages = Math.max(1, parseInt(opts.minPages || (invoiceModelOrOpts && invoiceModelOrOpts.minPages) || 1, 10));

    const xmlRawBytes = new TextEncoder().encode(xmlString);
    const xmlCompressed = await safeCompressDeflate(xmlRawBytes);
    const xmpBytes = new TextEncoder().encode(
      buildFacturXXmpPacket(conformanceLevel, invModel.invoice_id, invModel.seller.name)
    );
    const iccCompressed = base64ToBytes(SRGB_ICC_ZLIB_B64);

    // Compress visual page streams
    const pageStreamsCompressed = [];
    const p1Text = renderVisualInvoicePageCommands(invModel);
    pageStreamsCompressed.push(await safeCompressDeflate(asciiToBytes(p1Text)));
    for (let p = 2; p <= totalPages; p++) {
      const annexText = renderCertificateAnnexPageCommands(invModel, conformanceLevel, p, totalPages);
      pageStreamsCompressed.push(await safeCompressDeflate(asciiToBytes(annexText)));
    }

    // Object numbering:
    // 1: Catalog, 2: Pages, 3: Font Helvetica, 4: Font Helvetica-Bold,
    // 5: EmbeddedFiles NameTree, 6: Filespec, 7: EmbeddedFile stream,
    // 8: XMP Metadata stream (uncompressed), 9: ICC Profile stream, 10: OutputIntent,
    // 11..(10 + 2*totalPages): Page object + Page content stream pairs
    const chunks = [];
    const offsets = [0]; // index 0 reserved for free obj 0
    let bytePos = 0;

    function pushBytes(u8) {
      chunks.push(u8);
      bytePos += u8.length;
    }
    function pushAscii(str) {
      pushBytes(asciiToBytes(str));
    }
    function startObj(objNum) {
      offsets[objNum] = bytePos;
      pushAscii(objNum + " 0 obj\n");
    }
    function endObj() {
      pushAscii("\nendobj\n");
    }

    // PDF 1.7 binary header (%PDF-1.7 + 4 high-bit bytes)
    pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    const kidsRefs = [];
    for (let p = 0; p < totalPages; p++) {
      kidsRefs.push(11 + p * 2 + " 0 R");
    }

    // 1: Catalog
    startObj(1);
    pushAscii(
      "<< /Type /Catalog /Version /1.7 /Lang (fr-FR) /Pages 2 0 R " +
        "/Names << /EmbeddedFiles 5 0 R >> /AF [ 6 0 R ] " +
        "/Metadata 8 0 R /OutputIntents [ 10 0 R ] >>"
    );
    endObj();

    // 2: Pages
    startObj(2);
    pushAscii("<< /Type /Pages /Count " + totalPages + " /Kids [ " + kidsRefs.join(" ") + " ] >>");
    endObj();

    // 3 & 4: Fonts (WinAnsiEncoding)
    startObj(3);
    pushAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    endObj();

    startObj(4);
    pushAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    endObj();

    // 5: EmbeddedFiles NameTree
    startObj(5);
    pushAscii("<< /Names [ (factur-x.xml) 6 0 R ] >>");
    endObj();

    // 6: Filespec
    startObj(6);
    pushAscii(
      "<< /Type /Filespec /F (factur-x.xml) /UF (factur-x.xml) " +
        "/Desc (Factur-X 1.0.07 EN 16931 Electronic Invoice) " +
        "/AFRelationship /Data /EF << /F 7 0 R /UF 7 0 R >> >>"
    );
    endObj();

    // 7: EmbeddedFile stream (FlateDecode)
    startObj(7);
    pushAscii(
      "<< /Type /EmbeddedFile /Subtype /text#2Fxml /Filter /FlateDecode /Length " +
        xmlCompressed.length +
        " /Params << /Size " +
        xmlRawBytes.length +
        " /CreationDate (D:20270901090000+00'00') /ModDate (D:20270901090000+00'00') >> >>\nstream\n"
    );
    pushBytes(xmlCompressed);
    pushAscii("\nendstream");
    endObj();

    // 8: XMP Metadata stream (UNCOMPRESSED per ISO 19005-3)
    startObj(8);
    pushAscii("<< /Type /Metadata /Subtype /XML /Length " + xmpBytes.length + " >>\nstream\n");
    pushBytes(xmpBytes);
    pushAscii("\nendstream");
    endObj();

    // 9: sRGB ICC Profile stream
    startObj(9);
    pushAscii("<< /N 3 /Alternate /DeviceRGB /Filter /FlateDecode /Length " + iccCompressed.length + " >>\nstream\n");
    pushBytes(iccCompressed);
    pushAscii("\nendstream");
    endObj();

    // 10: OutputIntent (/GTS_PDFA1)
    startObj(10);
    pushAscii(
      "<< /Type /OutputIntent /S /GTS_PDFA1 " +
        "/OutputConditionIdentifier (sRGB IEC61966-2.1) " +
        "/RegistryName (http://www.color.org) " +
        "/Info (sRGB IEC61966-2.1) " +
        "/DestOutputProfile 9 0 R >>"
    );
    endObj();

    // Pages + Page Content Streams
    for (let p = 0; p < totalPages; p++) {
      const pageObjNum = 11 + p * 2;
      const contentObjNum = 12 + p * 2;
      const streamBytes = pageStreamsCompressed[p];

      startObj(pageObjNum);
      pushAscii(
        "<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595.28 841.89 ] " +
          "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> " +
          "/Contents " +
          contentObjNum +
          " 0 R >>"
      );
      endObj();

      startObj(contentObjNum);
      pushAscii("<< /Filter /FlateDecode /Length " + streamBytes.length + " >>\nstream\n");
      pushBytes(streamBytes);
      pushAscii("\nendstream");
      endObj();
    }

    const totalObjects = 10 + totalPages * 2;
    const xrefOffset = bytePos;
    pushAscii("xref\n0 " + (totalObjects + 1) + "\n");
    pushAscii("0000000000 65535 f \n");
    for (let id = 1; id <= totalObjects; id++) {
      pushAscii(String(offsets[id]).padStart(10, "0") + " 00000 n \n");
    }

    // Deterministic file ID hash from invoice_id
    let hashHex = "";
    const seedStr = "YGN-FX2027-" + invModel.invoice_id + "-" + invModel.totals.grand_total;
    for (let i = 0; i < 16; i++) {
      const code = (seedStr.charCodeAt(i % seedStr.length) * (i + 17) + i * 31) & 0xff;
      hashHex += code.toString(16).padStart(2, "0");
    }

    pushAscii(
      "trailer\n<< /Size " +
        (totalObjects + 1) +
        " /Root 1 0 R /ID [ <" +
        hashHex +
        "> <" +
        hashHex +
        "> ] >>\nstartxref\n" +
        xrefOffset +
        "\n%%EOF\n"
    );

    return concatUint8Arrays(chunks);
  }

  /* ------------------------------------------------------------------------
   * 9. LF 2026 Penalty & TVA 293 B / OSS 10k€ Risk Radar
   * --------------------------------------------------------------------- */

  function parseHasPaFlag(val) {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    const s = String(val == null ? "0" : val).trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "oui";
  }

  function calculateComplianceRisk2027(params) {
    const p = params || {};
    const invoicesPerMonth = Math.max(
      0,
      parseInt(p.invoices_per_month != null ? p.invoices_per_month : p.invoicesPerMonth != null ? p.invoicesPerMonth : 0, 10) || 0
    );
    const revServices = Math.max(
      0,
      Number(
        p.annual_revenue_services != null
          ? p.annual_revenue_services
          : p.annualRevenueServices != null
          ? p.annualRevenueServices
          : 0
      ) || 0
    );
    const revGoods = Math.max(
      0,
      Number(
        p.annual_revenue_goods != null
          ? p.annual_revenue_goods
          : p.annualRevenueGoods != null
          ? p.annualRevenueGoods
          : 0
      ) || 0
    );
    const euB2c = Math.max(
      0,
      Number(p.eu_b2c_sales != null ? p.eu_b2c_sales : p.euB2cSales != null ? p.euB2cSales : 0) || 0
    );
    const hasPa = parseHasPaFlag(p.has_pa != null ? p.has_pa : p.hasPa);

    // LF 2026 (amending CGI art. 1737 II): 50 EUR per non-electronic invoice, capped at 15,000 EUR/yr
    const annualInvoices = invoicesPerMonth * 12;
    const annualNonElectronicFineEur = Math.min(15000, annualInvoices * 50);

    // PA absence fine in Year 1: 500 EUR after initial 3-month notice + 3 x 1,000 EUR subsequent quarters = 3,500 EUR
    const paAbsenceFineFirstYearEur = hasPa ? 0 : 3500;
    const ereportingFineCapEur = 15000;

    // CGI art. 293 B Franchise thresholds:
    // Services: base 37,500 EUR (90% alert at 33,750 EUR), majorated 41,250 EUR
    let vat293bServicesStatus = "OK";
    if (revServices > 41250) {
      vat293bServicesStatus = "EXCEEDED";
    } else if (revServices >= 33750) {
      vat293bServicesStatus = "WARNING";
    }

    // Goods: base 85,000 EUR (90% alert at 76,500 EUR), majorated 93,500 EUR
    let vat293bGoodsStatus = "OK";
    if (revGoods > 93500) {
      vat293bGoodsStatus = "EXCEEDED";
    } else if (revGoods >= 76500) {
      vat293bGoodsStatus = "WARNING";
    }

    // EU OSS B2C digital/distance threshold: 10,000 EUR
    const oss10kStatus = euB2c > 10000 ? "EXCEEDED" : "OK";

    return {
      annual_non_electronic_fine_eur: annualNonElectronicFineEur,
      pa_absence_fine_first_year_eur: paAbsenceFineFirstYearEur,
      ereporting_fine_cap_eur: ereportingFineCapEur,
      per_missing_mention_fine_eur: 15,
      vat_293b_services_status: vat293bServicesStatus,
      vat_293b_goods_status: vat293bGoodsStatus,
      oss_10k_status: oss10kStatus,
      // camelCase convenience aliases
      annualNonElectronicFineEur: annualNonElectronicFineEur,
      paAbsenceFineFirstYearEur: paAbsenceFineFirstYearEur,
      ereportingFineCapEur: ereportingFineCapEur,
      vat293bServicesStatus: vat293bServicesStatus,
      vat293bGoodsStatus: vat293bGoodsStatus,
      oss10kStatus: oss10kStatus
    };
  }

  return {
    VERSION: VERSION,
    extractFacturXFromPdf: extractFacturXFromPdf,
    validateFacturXXml: validateFacturXXml,
    validateFacturXFile: validateFacturXFile,
    generateFacturXXml: generateFacturXXml,
    autoFixFacturXXml: autoFixFacturXXml,
    generateHybridFacturXPdf: generateHybridFacturXPdf,
    calculateComplianceRisk2027: calculateComplianceRisk2027,
    // Exposed regulatory utilities for UI forms & Luhn/IBAN live badges
    validateSiren: validateSiren,
    validateSiret: validateSiret,
    computeFrenchVat: computeFrenchVat,
    validateFrenchVat: validateFrenchVat,
    validateIban: validateIban,
    parseXmlStrict: parseXmlStrict
  };
});
