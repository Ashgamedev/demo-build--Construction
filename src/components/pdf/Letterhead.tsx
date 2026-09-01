import { Text, View, Image } from '@react-pdf/renderer';
import { CompanySettings } from '../../types';
import { commonStyles } from './shared';

interface LetterheadProps {
  settings: CompanySettings;
}

/**
 * Letterhead: logo top-left, name and address to its right on one line each.
 *
 * The earlier layout stacked a 60pt-tall centred logo above the centred name,
 * which ate a third of page one before any content appeared. Left-aligned and
 * smaller matches how professional letterheads print in India - the eye lands
 * on the logo first, reads the name next to it, and the rest of the page is
 * for the actual document. The proprietor / mobile row stays full-width below
 * the divider so the sender's line stays balanced across the page.
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
