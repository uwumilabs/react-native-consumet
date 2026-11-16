import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, R } from '../theme';

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder: string;
};

/** The search bar; ✕ empties it. */
export function SearchBox({ value, onChangeText, onSubmit, placeholder }: Props) {
  return (
    <View style={S.bar}>
      <Text style={S.icon}>⊙</Text>
      <TextInput
        style={S.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.dim}
        returnKeyType="search"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={HIT_SLOP}>
          <Text style={S.clear}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: R.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  icon: { fontSize: 16, color: colors.muted },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  clear: { fontSize: 13, color: colors.muted, padding: 4 },
});
