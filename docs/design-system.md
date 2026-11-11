# Design system

The interface is built with [`@kyzarky/ui`](https://github.com/KyzarKy/design-system), my design tokens and React components on Tailwind CSS 4.

| In the app | Component |
| --- | --- |
| Field and Class hierarchy switch, playback speed | `SegmentedControl` |
| Behavior buttons | `Button` |
| Panels | `Card` |
| Flight profile | `List`, `ListRow`, `Meter` |
| Trait tables | `Table` |
| Species and class pickers on a phone | `Select` |
| Every class name you can click | `Link` |

## One token changed

The app overrides the brand color and nothing else ([styles.css](../src/styles.css)):

```css
:root { --primary: light-dark(#2f6b4f, #6cc79a); }
```

Every component follows, in light and dark. The theme follows the system setting.

## What stayed in the app

Two pieces the package does not have yet live in [bits.tsx](../src/ui/bits.tsx), built from the same tokens: a navigation row (the species list and the class tree) and a tag. They move into the package when a second app needs them.

One deliberate difference: the package asks for 44px controls. The class tree has about fifty rows, so its rows are 36px with a mouse and 44px on touch screens.
