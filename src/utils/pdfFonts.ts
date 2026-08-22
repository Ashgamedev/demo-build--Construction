import { Font } from '@react-pdf/renderer';

let fontRegistered = false;

export function registerPDFFonts() {
  if (fontRegistered) return;
  
  // Register a Tamil-supporting font
  Font.register({
    family: 'NotoSansTamil',
    src: 'https://fonts.gstatic.com/s/notosanstamil/v21/ieVg2ZhZI2eCN5jzbjEHKwlZkEsw_Vn1N_g.ttf'
  });
  
  fontRegistered = true;
}
