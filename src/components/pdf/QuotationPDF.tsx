import { QuotationVersion } from '../../types';
import { TypeALabourPDF } from './TypeALabour';
import { TypeBFullSpecPDF } from './TypeBFullSpec';
import { TypeCMeasurementPDF } from './TypeCMeasurement';
import { registerPDFFonts } from '../../utils/pdfFonts';

registerPDFFonts();

interface Props {
  quotation: QuotationVersion;
}

export function QuotationPDF({ quotation }: Props) {
  switch (quotation.type) {
    case 'labour':
      return <TypeALabourPDF quotation={quotation} />;
    case 'full_spec':
      return <TypeBFullSpecPDF quotation={quotation} />;
    case 'measurement':
      return <TypeCMeasurementPDF quotation={quotation} />;
    default:
      return null;
  }
}
