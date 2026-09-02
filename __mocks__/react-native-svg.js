// Manual jest mock for react-native-svg. The package ships no jest setup as of
// 15.15.4, and its real components throw under react-test-renderer (the native
// views are absent), which makes toJSON() null. Each SVG element is rendered as
// a react-native View (SvgText as Text) that forwards all of its props, so the
// tree serializes and tests can read arc geometry (e.g. strokeDashoffset) and
// testIDs straight off the nodes.
//
// Auto-applied by jest for every `react-native-svg` import because it lives in
// a __mocks__ directory adjacent to node_modules at the project root.
const React = require('react');
const { View, Text } = require('react-native');

function mockSvgComponent(name, Host) {
  function MockSvgComponent(props) {
    return React.createElement(Host, props, props.children);
  }
  MockSvgComponent.displayName = name;
  return MockSvgComponent;
}

const Svg = mockSvgComponent('Svg', View);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Circle: mockSvgComponent('Circle', View),
  Path: mockSvgComponent('Path', View),
  Polygon: mockSvgComponent('Polygon', View),
  G: mockSvgComponent('G', View),
  Rect: mockSvgComponent('Rect', View),
  Line: mockSvgComponent('Line', View),
  Text: mockSvgComponent('SvgText', Text),
  Defs: mockSvgComponent('Defs', View),
  LinearGradient: mockSvgComponent('LinearGradient', View),
  Stop: mockSvgComponent('Stop', View),
};
