import { Text, View, Image } from '@react-pdf/renderer';
import { CompanySettings } from '../../types';
import { commonStyles } from './shared';

interface LetterheadProps {
  settings: CompanySettings;
}

/**
 * Letterhead: logo on the left, company name and address centered on the page.
 *
 * The logo sits at the left edge and the identity block (name + address) stays
 * visually centered on the page - a spacer the same width as the logo is placed
 * on the right so the text block's centre line is the page's centre line, not
 * the centre of what's left after the logo. That is what the client asked for:
 * logo moved off the top-centre onto the left, without shoving the name and
 * address across to the right with it.
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
        {/* Mirror-image spacer so the identity block centres on the page, not
            on the space left over next to the logo. */}
        <View style={commonStyles.letterheadSpacer} />
      </View>

      <View style={commonStyles.proprietorRow}>
        <Text>Proprietor: {settings?.proprietor || 'Proprietor Name'}</Text>
        <Text>Mobile: {settings?.mobileNumbers || 'Mobile Numbers'}</Text>
      </View>
    </View>
  );
}
