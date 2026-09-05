import { Text, View, Image } from '@react-pdf/renderer';
import { CompanySettings } from '../../types';
import { commonStyles } from './shared';

interface LetterheadProps {
  settings: CompanySettings;
}

/**
 * Letterhead: a small logo in the top-left corner, company name and address
 * centred on the page. The logo is absolutely positioned so it sits in the
 * corner without shifting the centred identity - the layout the client
 * settled on after trying several. Sizes and position live in shared.ts
 * (letterheadLogo / companyName / companyAddress).
 */
export function Letterhead({ settings }: LetterheadProps) {
  return (
    <View style={commonStyles.letterheadContainer}>
      <View style={commonStyles.letterheadRow}>
        <Image
          src={settings?.logoUrl || '/images/logo-mark-lg.png'}
          style={commonStyles.letterheadLogo}
        />
        <View style={commonStyles.letterheadIdentity}>
          <Text style={commonStyles.companyName}>
            {settings?.name ? settings.name.toUpperCase() : 'DEEPTHI CONSTRUCTION'}
          </Text>
          <Text style={commonStyles.companyAddress}>{settings?.address || 'Address not set'}</Text>
        </View>
      </View>

      <View style={commonStyles.proprietorRow}>
        <Text>Proprietor: {settings?.proprietor || 'Proprietor Name'}</Text>
        <Text>Mobile: {settings?.mobileNumbers || 'Mobile Numbers'}</Text>
      </View>
    </View>
  );
}
