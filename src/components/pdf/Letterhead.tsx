import { Text, View, Image } from '@react-pdf/renderer';
import { CompanySettings } from '../../types';
import { commonStyles } from './shared';

interface LetterheadProps {
  settings: CompanySettings;
}

export function Letterhead({ settings }: LetterheadProps) {
  return (
    <View style={commonStyles.letterheadContainer}>
      <Image 
        src={settings?.logoUrl || '/images/logo-mark-lg.png'} 
        style={{ width: 'auto', height: 60, alignSelf: 'center', marginBottom: 10, objectFit: 'contain' }} 
      />
      <Text style={commonStyles.companyName}>{settings?.name ? settings.name.toUpperCase() : 'DEEPTHI CONSTRUCTION'}</Text>
      <Text style={commonStyles.companyAddress}>{settings?.address || 'Address not set'}</Text>
      
      <View style={commonStyles.proprietorRow}>
        <Text>Proprietor: {settings?.proprietor || 'Proprietor Name'}</Text>
        <Text>Mobile: {settings?.mobileNumbers || 'Mobile Numbers'}</Text>
      </View>
    </View>
  );
}
