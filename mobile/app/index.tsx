import { View, Text } from 'react-native';
import { Compass } from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-900 px-6">
      <View className="w-16 h-16 rounded-2xl bg-brand-500/20 items-center justify-center mb-4 border border-brand-500/40">
        <Compass color="#10b981" size={32} />
      </View>
      <Text className="text-2xl font-bold text-white text-center">
        Travel Optimizer
      </Text>
      <Text className="text-sm text-slate-400 text-center mt-2">
        Expo Mobile App initialized successfully (Phase 0)
      </Text>
    </View>
  );
}
