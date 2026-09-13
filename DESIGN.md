# Verity exploratory design

## Scene and direction

A student studies on a laptop at a bright desk after class, switching between teacher notes and a difficult question. Light surfaces support reading and diagram contrast. Gold comes directly from the supplied mascot; dark charcoal gives the small character a confident, readable frame.

## Color strategy

Restrained product palette: near-neutral light background, white work surfaces, charcoal ink, gold for primary actions and selection. Subject colors are secondary identifiers, always paired with names. CSS uses OKLCH tokens. No decorative gradients or large diffuse shadows.

## Typography and geometry

Segoe UI/system sans. Fixed rem type scale; 14–16px controls and body, 30–38px page headings. 8px spacing rhythm, 10–16px container corners, pills reserved for tags and compact controls. Thin borders separate working regions; navigation is 224px on desktop.

## Navigation

Home, Study Studio, Practice, Progress, Opportunities, Portfolio. Secondary: Connections and Concept map. Study includes board/materials/notes modes and a tutor pane; quiz results link to Progress and Study. No backend or external authentication.

## Key components

Classroom subject grid, next-step study feature, editable demo diagram labels, step-through board, source drawer, fixed demo tutor responses, quiz setup/attempt/review, accessible topic table and radar, score formula comparison, fictional opportunity filters and saving, private local portfolio form, simulated connector states, clickable feature map.

## Motion and mascots

Use the original static Verity on the home feature and tutor identity. Additional poses use named asset placeholders. Step-through diagram reveal conveys explanation order. CSS transitions respect reduced motion. No invented mascot illustrations.

## Prototype data

Local storage persists exam mark, notes, completed practice evidence, saved opportunities, connector simulation and portfolio entries. Reset demo clears only Verity preview storage. User text is escaped before display. Storage failure leaves the current session usable. All network service connectors remain simulations.
