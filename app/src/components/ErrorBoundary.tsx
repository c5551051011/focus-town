import { Component, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { reportError } from '../lib/errors';
import { Pixel } from './Pixel';
import { PixelButton, Txt } from './ui';

// 예상치 못한 오류가 나도 하얀 화면 대신 복구 화면을 보여주고, 오류를 보고한다.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Pixel name="ruins" size={140} />
        <Txt style={styles.title}>OOPS!</Txt>
        <Txt style={styles.text}>Something went wrong.{'\n'}Your records are safe.</Txt>
        <PixelButton label="RESTART" onPress={() => this.setState({ failed: false })} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: colors.danger, fontSize: 20, marginTop: 24 },
  text: { color: colors.dim, fontSize: 9, lineHeight: 16, textAlign: 'center', marginVertical: 20 },
});
