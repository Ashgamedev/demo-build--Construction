export function sendWhatsAppMessage(phone: string, text: string) {
  // Remove non-numeric characters
  const formattedPhone = phone.replace(/\D/g, '');
  
  // URL encode the message
  const encodedText = encodeURIComponent(text);
  
  // Construct wa.me link
  // If the phone doesn't start with country code, assume India (+91)
  const finalPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
  
  const url = `https://wa.me/${finalPhone}?text=${encodedText}`;
  
  window.open(url, '_blank');
}
