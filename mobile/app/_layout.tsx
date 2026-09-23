import 'react-native-gesture-handler';
import '../global.css';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MobileI18nProvider } from '../context/MobileI18nContext';
import { MobileTripProvider } from '../context/MobileTripContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileI18nProvider>
          <MobileTripProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0f172a' },
              }}
            />
          </MobileTripProvider>
        </MobileI18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
