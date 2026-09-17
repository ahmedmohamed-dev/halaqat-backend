// ============================================================
// قائمة الدول المدعومة وطول رقم الهاتف المطلوب لكل دولة
// ============================================================

const countries = {
  EG: { name: "مصر", dialCode: "+20", phoneDigits: 11 },
  SA: { name: "السعودية", dialCode: "+966", phoneDigits: 9 },
  AE: { name: "الإمارات", dialCode: "+971", phoneDigits: 9 },
  JO: { name: "الأردن", dialCode: "+962", phoneDigits: 9 },
  SD: { name: "السودان", dialCode: "+249", phoneDigits: 9 },
};

function isValidPhoneForCountry(countryCode, phone) {
  const country = countries[countryCode];
  if (!country) return false;
  const digitsOnly = (phone || "").replace(/\D/g, "");
  return digitsOnly.length === country.phoneDigits;
}

module.exports = { countries, isValidPhoneForCountry };
