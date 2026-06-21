import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme/tokens';

interface Props {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function SegmentedControl({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            style={[styles.segment, isSelected ? styles.selected : styles.unselected]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.label, isSelected ? styles.selectedLabel : styles.unselectedLabel]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  segment: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  unselected: {
    backgroundColor: colors.cream,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  selectedLabel: {
    color: colors.cream,
  },
  unselectedLabel: {
    color: colors.ink,
  },
});
