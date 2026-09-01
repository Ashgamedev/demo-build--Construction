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
        {/* Absolutely positioned - the identity block below takes the full row
            width and centres itself on the page, and the logo just floats over
            it on the left. Moving the logo closer to the text is a one-number
            change in shared.ts (letterheadLogo.left) and does not disturb the
            title or the address. */}
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
