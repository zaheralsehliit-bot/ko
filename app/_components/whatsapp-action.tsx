type Props = { phone?: string | null; name?: string; label?: string; className?: string };

function normalize(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `963${digits.slice(1)}`;
  return digits;
}

export function WhatsAppAction({ phone, name = "", label = "واتساب", className = "whatsapp-action" }: Props) {
  const number = phone ? normalize(phone) : "";
  if (!number) return <span className="whatsapp-unavailable">لا يوجد واتساب</span>;
  const text = encodeURIComponent(`مرحباً ${name}، معك فريق KO Fighters.`);
  return <a className={className} href={`https://wa.me/${number}?text=${text}`} target="_blank" rel="noreferrer" aria-label={`مراسلة ${name || "العميل"} عبر واتساب`}>◉ {label}</a>;
}
