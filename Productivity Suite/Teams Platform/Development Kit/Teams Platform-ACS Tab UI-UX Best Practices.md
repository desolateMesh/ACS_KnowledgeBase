## Overview

This document provides comprehensive guidelines for designing and developing Azure Communication Services (ACS) Tabs in Microsoft Teams with exceptional user interface (UI) and user experience (UX). Following these best practices ensures that your ACS Tabs are intuitive, accessible, and aligned with Microsoft Teams design language, while delivering optimal performance and user satisfaction.

## Table of Contents

- [Design Principles](#design-principles)
- [Visual Design](#visual-design)
- [Information Architecture](#information-architecture)
- [Navigation and Interaction Patterns](#navigation-and-interaction-patterns)
- [Responsive Design](#responsive-design)
- [Performance Optimization](#performance-optimization)
- [Microsoft Teams Integration](#microsoft-teams-integration)
- [Accessibility Considerations](#accessibility-considerations)
- [Localization and Internationalization](#localization-and-internationalization)
- [Testing and Validation](#testing-and-validation)
- [Implementation Examples](#implementation-examples)
- [Resources](#resources)

## Design Principles

### Core Principles for ACS Tab Design

1. **Consistency with Teams**
   - Maintain visual and behavioral consistency with the Microsoft Teams interface
   - Follow Microsoft's Fluent Design System guidelines
   - Use familiar patterns and components that align with Teams UI conventions

2. **Simplicity and Clarity**
   - Focus on essential features and remove unnecessary complexity
   - Provide clear visual hierarchy and information architecture
   - Use progressive disclosure for advanced features

3. **Efficiency and Productivity**
   - Optimize for common tasks and workflows
   - Minimize clicks and cognitive load
   - Support keyboard shortcuts and alternative input methods

4. **Contextual Relevance**
   - Provide information and actions relevant to the current user context
   - Surface content based on user role, team membership, and recent activity
   - Integrate with Teams context (channels, chats, meetings)

5. **Responsiveness and Adaptability**
   - Design for all Teams clients (desktop, web, mobile)
   - Support different screen sizes, orientations, and input methods
   - Adapt to user preferences (theme, accessibility settings)

### User-Centered Design Process

1. **Research and Discovery**
   - Conduct user interviews and surveys
   - Analyze existing workflows and pain points
   - Define user personas and scenarios

2. **Ideation and Conceptualization**
   - Create user journey maps
   - Develop wireframes and low-fidelity prototypes
   - Review concepts with stakeholders

3. **Design and Prototyping**
   - Create high-fidelity designs
   - Build interactive prototypes
   - Conduct design reviews

4. **Testing and Validation**
   - Perform usability testing
   - Gather feedback from representative users
   - Iterate on designs based on findings

5. **Implementation and Deployment**
   - Work closely with developers
   - Conduct QA testing
   - Monitor post-launch metrics

## Visual Design

### Teams Design System Alignment

#### Fluent UI Integration

ACS Tabs should leverage Microsoft's Fluent UI React components to ensure consistency with the Teams environment:

```javascript
// Example: Using Fluent UI components in an ACS Tab
import { Button, Checkbox, Dialog, Dropdown, TextField } from '@fluentui/react';

function ACSTabContent() {
  return (
    <div className=\"acs-tab-container\">
      <TextField 
        label=\"Call Display Name\" 
        placeholder=\"Enter your name\" 
        required 
      />
      <Dropdown
        label=\"Audio Device\"
        placeholder=\"Select an audio device\"
        options={audioDeviceOptions}
      />
      <Checkbox 
        label=\"Enable video by default\" 
        checked={enableVideo} 
        onChange={toggleVideo} 
      />
      <Button 
        primary 
        text=\"Join Call\" 
        onClick={joinCall} 
      />
    </div>
  );
}
```

#### Typography

Follow Teams typography standards for consistent text presentation:

| Text Element | Font Family | Weight | Size (Desktop) | Size (Mobile) |
|--------------|-------------|--------|----------------|---------------|
| Heading 1    | Segoe UI    | SemiBold | 20px / 24px    | 18px / 22px   |
| Heading 2    | Segoe UI    | SemiBold | 16px / 20px    | 14px / 18px   |
| Body         | Segoe UI    | Regular | 14px / 18px    | 12px / 16px   |
| Caption      | Segoe UI    | Regular | 12px / 16px    | 10px / 14px   |
| Button       | Segoe UI    | SemiBold | 14px           | 14px          |

```css
/* Example: CSS implementing Teams typography standards */
.acs-tab-heading-1 {
  font-family: 'Segoe UI', sans-serif;
  font-weight: 600;
  font-size: 20px;
  line-height: 24px;
}

.acs-tab-body {
  font-family: 'Segoe UI', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 18px;
}

@media (max-width: 480px) {
  .acs-tab-heading-1 {
    font-size: 18px;
    line-height: 22px;
  }
  
  .acs-tab-body {
    font-size: 12px;
    line-height: 16px;
  }
}
```

#### Color Scheme

Adhere to Teams color palette and respect theme switching (light/dark):

```css
/* Example: CSS for Teams theme alignment */
.acs-tab-container {
  /* Base colors that adapt to Teams theme */
  color: var(--colorNeutralForeground1);
  background-color: var(--colorNeutralBackground1);
}

.acs-tab-primary-button {
  color: var(--colorNeutralForegroundOnBrand);
  background-color: var(--colorBrandBackground);
}

.acs-tab-secondary-button {
  color: var(--colorNeutralForeground1);
  background-color: var(--colorNeutralBackground1);
  border: 1px solid var(--colorNeutralStroke1);
}

.acs-tab-error-text {
  color: var(--colorPaletteRedForeground1);
}

.acs-tab-success-text {
  color: var(--colorPaletteGreenForeground1);
}
```

### Layout and Spacing

#### Grid System

Implement a flexible grid system for consistent layouts:

```css
/* Example: Grid system for ACS Tabs */
.acs-tab-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

.acs-tab-col-12 { grid-column: span 12; }
.acs-tab-col-8 { grid-column: span 8; }
.acs-tab-col-6 { grid-column: span 6; }
.acs-tab-col-4 { grid-column: span 4; }
.acs-tab-col-3 { grid-column: span 3; }

@media (max-width: 768px) {
  .acs-tab-col-md-12 { grid-column: span 12; }
  .acs-tab-col-md-6 { grid-column: span 6; }
  .acs-tab-col-md-4 { grid-column: span 4; }
}

@media (max-width: 480px) {
  .acs-tab-col-sm-12 { grid-column: span 12; }
  .acs-tab-col-sm-6 { grid-column: span 6; }
}
```

#### Spacing System

Use a consistent spacing scale throughout the interface:

```css
/* Example: Spacing system for ACS Tabs */
:root {
  --acs-spacing-xs: 4px;
  --acs-spacing-s: 8px;
  --acs-spacing-m: 16px;
  --acs-spacing-l: 24px;
  --acs-spacing-xl: 32px;
  --acs-spacing-xxl: 48px;
}

.acs-tab-section {
  margin-bottom: var(--acs-spacing-l);
}

.acs-tab-form-field {
  margin-bottom: var(--acs-spacing-m);
}

.acs-tab-buttons {
  display: flex;
  gap: var(--acs-spacing-s);
}
```

### Icons and Imagery

#### Icon Usage

Use Teams-compatible icons consistently:

```javascript
// Example: Using Fluent UI icons
import { Icon } from '@fluentui/react/lib/Icon';
import { initializeIcons } from '@fluentui/font-icons-mdl2';

// Initialize Fluent UI icons
initializeIcons();

function CommunicationControls() {
  return (
    <div className=\"acs-communication-controls\">
      <button className=\"acs-control-button\">
        <Icon iconName=\"Microphone\" />
        <span>Mute</span>
      </button>
      <button className=\"acs-control-button\">
        <Icon iconName=\"Video\" />
        <span>Camera</span>
      </button>
      <button className=\"acs-control-button\">
        <Icon iconName=\"ScreenShare\" />
        <span>Share</span>
      </button>
    </div>
  );
}
```

#### Image Guidelines

- Use SVG icons when possible for crisp rendering at all scales
- Optimize images for web performance (compression, lazy loading)
- Provide appropriate alt text for accessibility
- Maintain 16:9 or 4:3 aspect ratios for content imagery
- Include fallback patterns or colors for failed image loads

```javascript
// Example: Responsive and accessible image implementation
function UserAvatar({ user }) {
  return (
    <div className=\"acs-user-avatar\">
      <img 
        src={user.avatarUrl} 
        alt={`Profile picture of ${user.displayName}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = generateInitialsAvatar(user.displayName);
        }}
        loading=\"lazy\"
        width=\"48\"
        height=\"48\"
      />
    </div>
  );
}

function generateInitialsAvatar(displayName) {
  // Generate SVG with user's initials
  const initials = displayName.split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  // Create SVG with initials
  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" width=\"48\" height=\"48\">
    <rect width=\"48\" height=\"48\" fill=\"#0078d4\" />
    <text x=\"24\" y=\"30\" text-anchor=\"middle\" fill=\"white\" font-family=\"Segoe UI\" font-size=\"20\" font-weight=\"600\">
      ${initials}
    </text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
```

## Information Architecture

### Content Organization

#### Hierarchical Structure

Organize information in a clear hierarchy:

1. **Primary Level**
   - Main sections of your ACS Tab
   - Always visible in the main navigation

2. **Secondary Level**
   - Subsections within primary categories
   - Can be exposed through tabs, dropdown menus, or subnavigation

3. **Tertiary Level**
   - Detailed views or specific functions
   - Accessed through progressive disclosure

```javascript
// Example: React component implementing hierarchical navigation
function ACSTabNavigation() {
  const [activeSection, setActiveSection] = useState('calls');
  const [activeSubsection, setActiveSubsection] = useState('recent');
  
  return (
    <div className=\"acs-tab-container\">
      {/* Primary Navigation */}
      <nav className=\"acs-primary-nav\">
        <button 
          className={`acs-nav-item ${activeSection === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveSection('calls')}
        >
          Calls
        </button>
        <button 
          className={`acs-nav-item ${activeSection === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveSection('meetings')}
        >
          Meetings
        </button>
        <button 
          className={`acs-nav-item ${activeSection === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveSection('contacts')}
        >
          Contacts
        </button>
        <button 
          className={`acs-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveSection('settings')}
        >
          Settings
        </button>
      </nav>
      
      {/* Secondary Navigation */}
      {activeSection === 'calls' && (
        <nav className=\"acs-secondary-nav\">
          <button 
            className={`acs-subnav-item ${activeSubsection === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveSubsection('recent')}
          >
            Recent
          </button>
          <button 
            className={`acs-subnav-item ${activeSubsection === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveSubsection('favorites')}
          >
            Favorites
          </button>
          <button 
            className={`acs-subnav-item ${activeSubsection === 'missed' ? 'active' : ''}`}
            onClick={() => setActiveSubsection('missed')}
          >
            Missed
          </button>
        </nav>
      )}
      
      {/* Content Area */}
      <div className=\"acs-content-area\">
        {renderContent(activeSection, activeSubsection)}
      </div>
    </div>
  );
}
```

#### Information Density

Balance information density based on user needs:

- **High Density**: For power users, data-heavy applications, or dashboard views
- **Medium Density**: For general-purpose interfaces and mixed audiences
- **Low Density**: For focused tasks, mobile experiences, or novice users

```css
/* Example: CSS for adjustable information density */
:root {
  /* Default (medium) density variables */
  --acs-row-height: 48px;
  --acs-input-padding: 8px 12px;
  --acs-card-padding: 16px;
  --acs-line-height: 1.5;
}

/* High density mode */
.acs-density-high {
  --acs-row-height: 36px;
  --acs-input-padding: 4px 8px;
  --acs-card-padding: 12px;
  --acs-line-height: 1.3;
}

/* Low density mode */
.acs-density-low {
  --acs-row-height: 56px;
  --acs-input-padding: 12px 16px;
  --acs-card-padding: 24px;
  --acs-line-height: 1.6;
}

/* Application */
.acs-data-table tr {
  height: var(--acs-row-height);
}

.acs-form-input {
  padding: var(--acs-input-padding);
}

.acs-card {
  padding: var(--acs-card-padding);
}

.acs-text {
  line-height: var(--acs-line-height);
}
```

### Content Prioritization

#### Critical vs. Secondary Content

Prioritize content by importance:

- **Critical**: Essential information and actions (e.g., call controls, active participants)
  - Position prominently in the visual hierarchy
  - Always visible without scrolling on primary breakpoints
  - Use visual emphasis (size, color, weight)

- **Secondary**: Supporting information and less frequent actions (e.g., call history, settings)
  - Position below critical content
  - Can require scrolling or additional interaction to access
  - Use less visual emphasis

- **Tertiary**: Optional details and advanced features (e.g., detailed analytics, advanced settings)
  - Place behind progressive disclosure patterns (expandable sections, \"show more\" buttons)
  - Consider moving to separate views or modals

```javascript
// Example: React component implementing content prioritization
function CallInterface() {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  return (
    <div className=\"acs-call-interface\">
      {/* Critical Content */}
      <section className=\"acs-critical-content\">
        <div className=\"acs-active-speaker\">
          <video ref={mainVideoRef} autoPlay muted />
          <div className=\"acs-speaker-info\">
            <h2>John Smith</h2>
            <span>Speaking</span>
          </div>
        </div>
        
        <div className=\"acs-call-controls\">
          <button className=\"acs-control-button\">
            <Icon iconName=\"Microphone\" />
          </button>
          <button className=\"acs-control-button\">
            <Icon iconName=\"Video\" />
          </button>
          <button className=\"acs-control-button acs-end-call\">
            <Icon iconName=\"DeclineCall\" />
          </button>
        </div>
      </section>
      
      {/* Secondary Content */}
      <section className=\"acs-secondary-content\">
        <div className=\"acs-participants-list\">
          <h3>Participants (5)</h3>
          <ul>
            {participants.map(participant => (
              <li key={participant.id}>
                <img src={participant.avatar} alt=\"\" />
                <span>{participant.name}</span>
                {participant.isMuted && <Icon iconName=\"MicOff\" />}
              </li>
            ))}
          </ul>
        </div>
        
        <div className=\"acs-chat-panel\">
          <h3>Meeting Chat</h3>
          <div className=\"acs-chat-messages\">
            {messages.map(message => (
              <div key={message.id} className=\"acs-chat-message\">
                <span className=\"acs-message-sender\">{message.sender}:</span>
                <span className=\"acs-message-text\">{message.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Tertiary Content - Progressive Disclosure */}
      <section className=\"acs-tertiary-content\">
        <button 
          className=\"acs-expand-button\"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
          <Icon iconName={showAdvancedSettings ? 'ChevronUp' : 'ChevronDown'} />
        </button>
        
        {showAdvancedSettings && (
          <div className=\"acs-advanced-settings\">
            <h3>Advanced Settings</h3>
            <div className=\"acs-settings-group\">
              <h4>Audio Settings</h4>
              {/* Advanced audio settings */}
            </div>
            <div className=\"acs-settings-group\">
              <h4>Video Settings</h4>
              {/* Advanced video settings */}
            </div>
            <div className=\"acs-settings-group\">
              <h4>Network Settings</h4>
              {/* Advanced network settings */}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
```

## Navigation and Interaction Patterns

### Navigation Patterns

#### Primary Navigation

Design primary navigation for clarity and efficiency:

- Use clear, descriptive labels for navigation items
- Highlight the active/current section
- Keep primary navigation persistent and easily accessible
- Limit primary navigation to 5-7 items maximum

```javascript
// Example: Primary navigation component
function PrimaryNavigation() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ViewDashboard' },
    { id: 'calls', label: 'Calls', icon: 'Phone' },
    { id: 'meetings', label: 'Meetings', icon: 'Calendar' },
    { id: 'messages', label: 'Messages', icon: 'Chat' },
    { id: 'contacts', label: 'Contacts', icon: 'People' }
  ];
  
  return (
    <nav className=\"acs-primary-navigation\">
      <ul>
        {navigation.map(item => (
          <li key={item.id}>
            <button
              className={`acs-nav-button ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => setActiveItem(item.id)}
              aria-current={activeItem === item.id ? 'page' : undefined}
            >
              <Icon iconName={item.icon} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

#### Secondary Navigation Patterns

Choose appropriate secondary navigation based on content structure:

1. **Tabs**
   - Best for parallel content categories at the same level
   - Use when users need to switch between different views of related content
   - Keep tab labels short and descriptive

2. **Vertical Navigation**
   - Best for hierarchical structures with many items
   - Good for deep navigation with multiple levels
   - Provides more space for longer labels

3. **Dropdown Menus**
   - Best for conserving space with numerous options
   - Use for less frequently accessed sections
   - Group related items logically

```javascript
// Example: Tabs component for secondary navigation
function TabNavigation({ tabs, activeTab, setActiveTab }) {
  return (
    <div className=\"acs-tabs-container\">
      <div role=\"tablist\" className=\"acs-tabs\">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role=\"tab\"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`acs-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className=\"acs-tab-panels\">
        {tabs.map(tab => (
          <div
            key={tab.id}
            role=\"tabpanel\"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            className=\"acs-tab-panel\"
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Interaction Patterns

#### Input Controls

Choose appropriate input controls based on the type of data:

| Input Type | Best For | Example Use Cases |
|------------|----------|-----------------|
| Text Field | Free-form text | Names, descriptions, messages |
| Dropdown   | Selection from limited options | Status, category, type |
| Radio Buttons | Mutually exclusive options (≤5) | Yes/No choices, basic settings |
| Checkboxes | Multiple selections | Features to enable, preferences |
| Toggle Switch | Binary settings | On/Off states, feature activation |
| Slider | Range selection | Volume, image size, numeric ranges |
| Date Picker | Date selection | Scheduling, filtering by date |
| File Upload | Document/media submission | Profile pictures, attachments |

```javascript
// Example: Form with appropriate input controls
function CommunicationSettings() {
  return (
    <form className=\"acs-settings-form\">
      <div className=\"acs-form-field\">
        <label htmlFor=\"display-name\">Display Name</label>
        <TextField 
          id=\"display-name\"
          placeholder=\"Enter your name as shown to others\"
          required
        />
      </div>
      
      <div className=\"acs-form-field\">
        <label htmlFor=\"status\">Status</label>
        <Dropdown
          id=\"status\"
          options={[
            { key: 'available', text: 'Available' },
            { key: 'busy', text: 'Busy' },
            { key: 'doNotDisturb', text: 'Do Not Disturb' },
            { key: 'away', text: 'Away' }
          ]}
          defaultSelectedKey=\"available\"
        />
      </div>
      
      <div className=\"acs-form-field\">
        <label>Notification Sound</label>
        <div className=\"acs-radio-group\">
          <RadioButton
            label=\"Default\"
            checked={notificationSound === 'default'}
            onChange={() => setNotificationSound('default')}
          />
          <RadioButton
            label=\"Classic\"
            checked={notificationSound === 'classic'}
            onChange={() => setNotificationSound('classic')}
          />
          <RadioButton
            label=\"Subtle\"
            checked={notificationSound === 'subtle'}
            onChange={() => setNotificationSound('subtle')}
          />
          <RadioButton
            label=\"None\"
            checked={notificationSound === 'none'}
            onChange={() => setNotificationSound('none')}
          />
        </div>
      </div>
      
      <div className=\"acs-form-field\">
        <label>Privacy Options</label>
        <div className=\"acs-checkbox-group\">
          <Checkbox
            label=\"Show when I'm typing\"
            checked={showTypingIndicator}
            onChange={toggleTypingIndicator}
          />
          <Checkbox
            label=\"Show read receipts\"
            checked={showReadReceipts}
            onChange={toggleReadReceipts}
          />
          <Checkbox
            label=\"Allow others to see my presence\"
            checked={showPresence}
            onChange={togglePresence}
          />
        </div>
      </div>
      
      <div className=\"acs-form-field\">
        <Toggle
          label=\"Automatically join audio in meetings\"
          checked={autoJoinAudio}
          onChange={toggleAutoJoinAudio}
        />
      </div>
      
      <div className=\"acs-form-field\">
        <label htmlFor=\"microphone-volume\">Microphone Volume</label>
        <Slider
          id=\"microphone-volume\"
          min={0}
          max={100}
          step={1}
          value={microphoneVolume}
          onChange={setMicrophoneVolume}
          showValue
          valueFormat={value => `${value}%`}
        />
      </div>
      
      <div className=\"acs-form-field\">
        <label htmlFor=\"meeting-date\">Next Meeting Date</label>
        <DatePicker
          id=\"meeting-date\"
          value={meetingDate}
          onSelectDate={setMeetingDate}
          minDate={new Date()}
        />
      </div>
      
      <div className=\"acs-form-field\">
        <label htmlFor=\"profile-picture\">Profile Picture</label>
        <FileUpload
          id=\"profile-picture\"
          accept=\"image/*\"
          onChange={handleProfilePictureUpload}
        />
      </div>
      
      <div className=\"acs-form-actions\">
        <Button text=\"Cancel\" onClick={cancel} />
        <Button primary text=\"Save Changes\" onClick={saveChanges} />
      </div>
    </form>
  );
}
```

#### Feedback and Confirmation

Provide clear feedback for user actions:

1. **Immediate Visual Feedback**
   - Button state changes
   - Focus and hover states
   - Loading indicators

2. **Status Messages**
   - Success confirmations
   - Error notifications
   - Warning alerts
   - Informational messages

3. **Confirmation Dialogs**
   - Use for destructive or irreversible actions
   - Clearly explain consequences
   - Provide clear options (e.g., \"Delete\" vs \"Cancel\")

```javascript
// Example: Feedback and confirmation patterns
function DeleteContactDialog({ isOpen, contactName, onConfirm, onDismiss }) {
  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Delete Contact',
        subText: `Are you sure you want to delete ${contactName}? This action cannot be undone.`
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 450 } }
      }}
    >
      <DialogFooter>
        <Button onClick={onDismiss} text=\"Cancel\" />
        <Button 
          primary 
          onClick={onConfirm} 
          text=\"Delete\" 
          styles={{ root: { backgroundColor: '#d13438' } }}
        />
      </DialogFooter>
    </Dialog>
  );
}

function StatusMessages() {
  const [messages, setMessages] = useState([]);
  
  const addStatusMessage = (message, type) => {
    const id = Date.now();
    setMessages([...messages, { id, message, type }]);
    
    // Auto-dismiss after delay
    setTimeout(() => {
      setMessages(currentMessages => 
        currentMessages.filter(msg => msg.id !== id)
      );
    }, 5000);
  };
  
  const removeMessage = (id) => {
    setMessages(messages.filter(msg => msg.id !== id));
  };
  
  return (
    <div className=\"acs-status-messages\">
      {messages.map(msg => (
        <div 
          key={msg.id} 
          className={`acs-status-message acs-status-${msg.type}`}
          role={msg.type === 'error' ? 'alert' : 'status'}
          aria-live={msg.type === 'error' ? 'assertive' : 'polite'}
        >
          <Icon iconName={getIconForMessageType(msg.type)} />
          <span>{msg.message}</span>
          <button 
            className=\"acs-dismiss-message\" 
            onClick={() => removeMessage(msg.id)}
            aria-label=\"Dismiss message\"
          >
            <Icon iconName=\"Cancel\" />
          </button>
        </div>
      ))}
    </div>
  );
}

function getIconForMessageType(type) {
  switch (type) {
    case 'success': return 'CheckMark';
    case 'error': return 'Error';
    case 'warning': return 'Warning';
    case 'info': return 'Info';
    default: return 'Info';
  }
}
```

## Responsive Design

### Teams Client Requirements

#### Platform Support

Design for all Teams platforms with responsive layouts:

- **Desktop App (Windows/Mac)**
  - Primary platform, fullest feature set
  - Optimized for productivity and multitasking
  - Support for keyboard/mouse interaction

- **Web App (Browser)**
  - Feature parity with desktop when possible
  - Consider browser-specific limitations
  - Support for keyboard/mouse interaction

- **Mobile App (iOS/Android)**
  - Simplified UI for touch interaction
  - Focus on core functionality
  - Accommodate smaller screen sizes
  - Consider offline and low-bandwidth scenarios

```javascript
// Example: Platform-specific component rendering
function PlatformAwareComponent({ children }) {
  const [platform, setPlatform] = useState('desktop');
  
  useEffect(() => {
    // Detect platform using Teams SDK
    if (microsoftTeams) {
      microsoftTeams.getContext((context) => {
        if (context.hostClientType === 'android' || context.hostClientType === 'ios') {
          setPlatform('mobile');
        } else if (context.hostClientType === 'web') {
          setPlatform('web');
        } else {
          setPlatform('desktop');
        }
      });
    }
  }, []);
  
  // Apply platform-specific classes
  return (
    <div className={`acs-platform-${platform}`}>
      {children}
    </div>
  );
}
```

#### Responsive Breakpoints

Implement responsive designs using Teams breakpoint standards:

| Breakpoint Name | Width Range | Target Devices |
|-----------------|-------------|---------------|
| Small | < 480px | Mobile phones |
| Medium | 480px - 640px | Large phones, small tablets |
| Large | 640px - 1024px | Tablets, small desktops |
| Extra Large | 1024px+ | Desktop |

```css
/* Example: Responsive styles using Teams breakpoints */
/* Base styles (mobile first) */
.acs-tab-container {
  padding: 8px;
}

.acs-tab-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

/* Medium breakpoint (480px and up) */
@media (min-width: 480px) {
  .acs-tab-container {
    padding: 12px;
  }
  
  .acs-tab-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

/* Large breakpoint (640px and up) */
@media (min-width: 640px) {
  .acs-tab-container {
    padding: 16px;
  }
  
  .acs-tab-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Extra large breakpoint (1024px and up) */
@media (min-width: 1024px) {
  .acs-tab-container {
    padding: 20px;
  }
  
  .acs-tab-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
}
```

### Adaptive Layout Patterns

#### Container Queries

Use container queries for more granular responsive designs:

```css
/* Example: Container query implementation (with polyfill) */
.acs-responsive-container {
  container-type: inline-size;
  container-name: main-container;
}

@container main-container (min-width: 400px) {
  .acs-card {
    display: flex;
    flex-direction: row;
  }
  
  .acs-card-image {
    width: 30%;
  }
  
  .acs-card-content {
    width: 70%;
  }
}

@container main-container (max-width: 399px) {
  .acs-card {
    display: flex;
    flex-direction: column;
  }
  
  .acs-card-image {
    width: 100%;
  }
  
  .acs-card-content {
    width: 100%;
  }
}
```

#### Layout Patterns

Implement these responsive layout patterns:

1. **Stack-to-Grid**
   - Single column on small screens, grid on larger screens
   - Maintains content hierarchy across screen sizes

2. **Priority+ Navigation**
   - Shows most important items first
   - Moves lower-priority items to dropdown menu as screen size decreases

3. **Responsive Tables**
   - Horizontal scroll on small screens
   - Card view transformation for very small screens

4. **Sidebar Transformations**
   - Full sidebar on large screens
   - Collapsible/expandable on medium screens
   - Bottom navigation or hamburger menu on small screens

```javascript
// Example: Priority+ Navigation
function PriorityNavigation() {
  const [visibleItems, setVisibleItems] = useState([]);
  const [overflowItems, setOverflowItems] = useState([]);
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  
  const allItems = [
    { id: 'calls', label: 'Calls' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'chat', label: 'Chat' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'files', label: 'Files' },
    { id: 'settings', label: 'Settings' }
  ];
  
  // Measure and adjust visible items based on available space
  useEffect(() => {
    const adjustVisibleItems = () => {
      if (!navRef.current) return;
      
      const containerWidth = navRef.current.offsetWidth;
      const overflowButtonWidth = 48; // Width of the overflow button
      const availableWidth = containerWidth - overflowButtonWidth;
      
      let totalWidth = 0;
      let visibleCount = 0;
      
      // Calculate how many items can fit
      for (let i = 0; i < itemRefs.current.length; i++) {
        const item = itemRefs.current[i];
        if (!item) continue;
        
        totalWidth += item.offsetWidth;
        
        if (totalWidth > availableWidth) break;
        visibleCount++;
      }
      
      // Update state with visible and overflow items
      setVisibleItems(allItems.slice(0, visibleCount));
      setOverflowItems(allItems.slice(visibleCount));
    };
    
    // Set initial refs and run adjustment
    itemRefs.current = itemRefs.current.slice(0, allItems.length);
    adjustVisibleItems();
    
    // Add resize observer
    const resizeObserver = new ResizeObserver(adjustVisibleItems);
    if (navRef.current) {
      resizeObserver.observe(navRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [allItems]);
  
  return (
    <nav className=\"acs-priority-nav\" ref={navRef}>
      <ul className=\"acs-priority-nav-items\">
        {visibleItems.map((item, index) => (
          <li key={item.id}>
            <button 
              ref={el => (itemRefs.current[index] = el)}
              className=\"acs-nav-item\"
            >
              {item.label}
            </button>
          </li>
        ))}
        
        {overflowItems.length > 0 && (
          <li className=\"acs-overflow-menu\">
            <Dropdown
              iconProps={{ iconName: 'More' }}
              ariaLabel=\"More options\"
              options={overflowItems.map(item => ({
                key: item.id,
                text: item.label
              }))}
            />
          </li>
        )}
      </ul>
    </nav>
  );
}
```

#### Responsive Table Implementation

```javascript
// Example: Responsive table component
function ResponsiveTable({ headers, data }) {
  return (
    <div className=\"acs-responsive-table-container\">
      {/* Traditional table (visible on larger screens) */}
      <table className=\"acs-table acs-table-desktop\">
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header.key}>{header.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map(header => (
                <td key={header.key}>{row[header.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Card view (visible on mobile) */}
      <div className=\"acs-table-cards\">
        {data.map((row, rowIndex) => (
          <div key={rowIndex} className=\"acs-table-card\">
            {headers.map(header => (
              <div key={header.key} className=\"acs-table-card-row\">
                <div className=\"acs-table-card-label\">{header.label}</div>
                <div className=\"acs-table-card-value\">{row[header.key]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// CSS for responsive table
const responsiveTableStyles = `
  /* Container to enable horizontal scrolling on small screens */
  .acs-responsive-table-container {
    width: 100%;
    overflow-x: auto;
  }
  
  /* Desktop table styles */
  .acs-table-desktop {
    width: 100%;
    border-collapse: collapse;
  }
  
  .acs-table-desktop th,
  .acs-table-desktop td {
    padding: 8px 16px;
    text-align: left;
    border-bottom: 1px solid var(--colorNeutralStroke2);
  }
  
  /* Card view (hidden by default) */
  .acs-table-cards {
    display: none;
  }
  
  /* Switch to card view on small screens */
  @media (max-width: 480px) {
    .acs-table-desktop {
      display: none;
    }
    
    .acs-table-cards {
      display: block;
    }
    
    .acs-table-card {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid var(--colorNeutralStroke2);
      border-radius: 4px;
    }
    
    .acs-table-card-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--colorNeutralStroke1Hover);
    }
    
    .acs-table-card-row:last-child {
      border-bottom: none;
    }
    
    .acs-table-card-label {
      font-weight: 600;
      margin-right: 8px;
    }
  }
`;
```

## Performance Optimization

### Loading Performance

#### Initial Load Optimization

Implement techniques to optimize initial load times:

1. **Code Splitting**
   - Split your JavaScript bundle into smaller chunks
   - Load non-critical components on demand
   - Use dynamic imports for route-based code splitting

```javascript
// Example: Code splitting with React.lazy and Suspense
import React, { Suspense, lazy } from 'react';

// Lazy-loaded components
const Dashboard = lazy(() => import('./components/Dashboard'));
const CallsView = lazy(() => import('./components/CallsView'));
const MeetingsView = lazy(() => import('./components/MeetingsView'));
const SettingsView = lazy(() => import('./components/SettingsView'));

function ACSTab() {
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Render the selected view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'calls':
        return <CallsView />;
      case 'meetings':
        return <MeetingsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };
  
  return (
    <div className=\"acs-tab-container\">
      {/* Navigation */}
      <nav className=\"acs-tab-nav\">
        <button onClick={() => setCurrentView('dashboard')}>Dashboard</button>
        <button onClick={() => setCurrentView('calls')}>Calls</button>
        <button onClick={() => setCurrentView('meetings')}>Meetings</button>
        <button onClick={() => setCurrentView('settings')}>Settings</button>
      </nav>
      
      {/* Content with loading fallback */}
      <Suspense fallback={<div className=\"acs-loading-spinner\">Loading...</div>}>
        {renderView()}
      </Suspense>
    </div>
  );
}
```

2. **Asset Optimization**
   - Compress images and use appropriate formats (WebP, SVG)
   - Minify CSS and JavaScript
   - Use tree shaking to eliminate unused code
   - Implement proper caching strategies

3. **Critical CSS**
   - Inline critical CSS for above-the-fold content
   - Defer non-critical CSS loading

```javascript
// Example: Critical CSS implementation
function CriticalCSS() {
  return (
    <head>
      {/* Inline critical CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Critical styles needed for initial render */
        .acs-tab-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .acs-tab-nav {
          display: flex;
          background-color: var(--colorNeutralBackground1);
          border-bottom: 1px solid var(--colorNeutralStroke2);
        }
        
        .acs-loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          width: 100%;
        }
      `}} />
      
      {/* Defer non-critical CSS */}
      <link 
        rel=\"preload\" 
        href=\"styles/non-critical.css\" 
        as=\"style\" 
        onLoad=\"this.onload=null;this.rel='stylesheet'\"
      />
      <noscript>
        <link rel=\"stylesheet\" href=\"styles/non-critical.css\" />
      </noscript>
    </head>
  );
}
```

#### Loading States

Implement meaningful loading states:

1. **Skeleton Screens**
   - Show layout placeholders resembling the content
   - Reduces perceived loading time
   - Maintains visual stability

2. **Progressive Loading**
   - Load and display critical content first
   - Add non-critical content progressively
   - Prioritize above-the-fold content

```javascript
// Example: Skeleton loading component
function ContactCardSkeleton() {
  return (
    <div className=\"acs-contact-card acs-skeleton\">
      <div className=\"acs-contact-avatar acs-skeleton-circle\"></div>
      <div className=\"acs-contact-info\">
        <div className=\"acs-contact-name acs-skeleton-text\"></div>
        <div className=\"acs-contact-title acs-skeleton-text acs-skeleton-text-short\"></div>
        <div className=\"acs-contact-status acs-skeleton-text acs-skeleton-text-short\"></div>
      </div>
      <div className=\"acs-contact-actions\">
        <div className=\"acs-skeleton-circle acs-skeleton-button\"></div>
        <div className=\"acs-skeleton-circle acs-skeleton-button\"></div>
      </div>
    </div>
  );
}

function ContactListSkeleton({ count = 5 }) {
  return (
    <div className=\"acs-contact-list acs-skeleton-container\">
      {Array(count).fill(0).map((_, index) => (
        <ContactCardSkeleton key={index} />
      ))}
    </div>
  );
}

// CSS for skeleton loading
const skeletonStyles = `
  .acs-skeleton {
    position: relative;
    overflow: hidden;
  }
  
  .acs-skeleton::after {
    content: \"\";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0),
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0)
    );
    animation: acs-skeleton-shine 1.5s infinite;
  }
  
  .acs-skeleton-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--colorNeutralBackground3);
  }
  
  .acs-skeleton-text {
    height: 16px;
    margin-bottom: 8px;
    background-color: var(--colorNeutralBackground3);
    border-radius: 4px;
    width: 100%;
  }
  
  .acs-skeleton-text-short {
    width: 60%;
  }
  
  .acs-skeleton-button {
    width: 32px;
    height: 32px;
  }
  
  @keyframes acs-skeleton-shine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
```

### Runtime Performance

#### Rendering Optimization

Implement techniques to optimize rendering performance:

1. **List Virtualization**
   - Render only visible items in long lists
   - Recycle DOM elements as user scrolls
   - Use `react-window` or similar libraries

```javascript
// Example: Virtualized list with react-window
import { FixedSizeList } from 'react-window';

function VirtualizedContactList({ contacts }) {
  // Render a single contact item
  const ContactItem = ({ index, style }) => {
    const contact = contacts[index];
    
    return (
      <div style={style} className=\"acs-contact-item\">
        <img 
          src={contact.avatar} 
          alt=\"\" 
          className=\"acs-contact-avatar\" 
        />
        <div className=\"acs-contact-details\">
          <div className=\"acs-contact-name\">{contact.name}</div>
          <div className=\"acs-contact-title\">{contact.title}</div>
        </div>
        <div className=\"acs-contact-actions\">
          <button aria-label=\"Call\">
            <Icon iconName=\"Phone\" />
          </button>
          <button aria-label=\"Chat\">
            <Icon iconName=\"Chat\" />
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className=\"acs-virtualized-list-container\">
      <FixedSizeList
        height={400}
        width=\"100%\"
        itemCount={contacts.length}
        itemSize={72}
      >
        {ContactItem}
      </FixedSizeList>
    </div>
  );
}
```

2. **Memoization**
   - Use React.memo for expensive components
   - Use useMemo for expensive calculations
   - Use useCallback for stable function references

```javascript
// Example: Memoization for performance optimization
import React, { useState, useMemo, useCallback } from 'react';

// Memoized component
const MemoizedContactCard = React.memo(function ContactCard({ contact, onCall, onChat }) {
  console.log(`Rendering contact card for ${contact.name}`);
  
  return (
    <div className=\"acs-contact-card\">
      <img src={contact.avatar} alt=\"\" className=\"acs-contact-avatar\" />
      <div className=\"acs-contact-info\">
        <div className=\"acs-contact-name\">{contact.name}</div>
        <div className=\"acs-contact-title\">{contact.title}</div>
        <div className=\"acs-contact-status\">{contact.status}</div>
      </div>
      <div className=\"acs-contact-actions\">
        <button onClick={() => onCall(contact.id)} aria-label=\"Call\">
          <Icon iconName=\"Phone\" />
        </button>
        <button onClick={() => onChat(contact.id)} aria-label=\"Chat\">
          <Icon iconName=\"Chat\" />
        </button>
      </div>
    </div>
  );
});

function ContactsSection({ contacts, filter }) {
  // Memoized filtered contacts
  const filteredContacts = useMemo(() => {
    console.log('Filtering contacts');
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [contacts, filter]);
  
  // Stable callback references
  const handleCall = useCallback((contactId) => {
    console.log(`Calling contact ${contactId}`);
    // Initiate call logic
  }, []);
  
  const handleChat = useCallback((contactId) => {
    console.log(`Chatting with contact ${contactId}`);
    // Open chat logic
  }, []);
  
  return (
    <div className=\"acs-contacts-section\">
      <div className=\"acs-contacts-count\">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
      <div className=\"acs-contacts-list\">
        {filteredContacts.map(contact => (
          <MemoizedContactCard
            key={contact.id}
            contact={contact}
            onCall={handleCall}
            onChat={handleChat}
          />
        ))}
      </div>
    </div>
  );
}
```

3. **Debouncing and Throttling**
   - Debounce rapidly firing events like search input
   - Throttle scroll and resize handlers

```javascript
// Example: Debouncing search input
import { useState, useEffect } from 'react';

function SearchInput({ onSearch }) {
  const [inputValue, setInputValue] = useState('');
  
  // Debounce the search to avoid excessive API calls
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (inputValue) {
        onSearch(inputValue);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [inputValue, onSearch]);
  
  return (
    <div className=\"acs-search-container\">
      <Icon iconName=\"Search\" />
      <input
        type=\"text\"
        className=\"acs-search-input\"
        placeholder=\"Search contacts...\"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue && (
        <button 
          className=\"acs-search-clear\" 
          onClick={() => setInputValue('')}
          aria-label=\"Clear search\"
        >
          <Icon iconName=\"Cancel\" />
        </button>
      )}
    </div>
  );
}
```

#### Memory Management

Implement proper memory management practices:

1. **Clean Up Resources**
   - Use useEffect cleanup functions
   - Dispose of event listeners, timers, and subscriptions
   - Close connections when components unmount

```javascript
// Example: Proper cleanup in useEffect
function CallMonitor({ callId }) {
  const [callStatus, setCallStatus] = useState('connecting');
  const [callDuration, setCallDuration] = useState(0);
  
  // Set up call monitoring and clean up properly
  useEffect(() => {
    // Set up status subscription
    const statusSubscription = callClient.calls
      .getCallById(callId)
      .onStateChanged((state) => {
        setCallStatus(state);
      });
    
    // Set up timer for call duration
    let durationTimer = null;
    if (callStatus === 'connected') {
      durationTimer = setInterval(() => {
        setCallDuration(prevDuration => prevDuration + 1);
      }, 1000);
    }
    
    // Clean up subscriptions and timers
    return () => {
      statusSubscription.unsubscribe();
      if (durationTimer) {
        clearInterval(durationTimer);
      }
    };
  }, [callId, callStatus]);
  
  return (
    <div className=\"acs-call-monitor\">
      <div className=\"acs-call-status\">{callStatus}</div>
      {callStatus === 'connected' && (
        <div className=\"acs-call-duration\">
          {formatDuration(callDuration)}
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

2. **Avoid Memory Leaks**
   - Be mindful of circular references
   - Avoid creating closures that retain large objects
   - Use weak references when appropriate

## Microsoft Teams Integration

### Teams Context

#### Context Acquisition

Access and utilize Teams context information:

```javascript
// Example: Accessing Teams context
import * as microsoftTeams from '@microsoft/teams-js';

function TeamsAwareComponent() {
  const [context, setContext] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Initialize Teams SDK
    try {
      microsoftTeams.initialize();
      
      // Get the Teams context
      microsoftTeams.getContext((teamsContext) => {
        setContext(teamsContext);
      });
    } catch (err) {
      setError('Failed to initialize Teams SDK');
      console.error('Teams SDK initialization error:', err);
    }
  }, []);
  
  if (error) {
    return <div className=\"acs-error-message\">{error}</div>;
  }
  
  if (!context) {
    return <div className=\"acs-loading\">Loading Teams context...</div>;
  }
  
  return (
    <div className=\"acs-teams-aware-component\">
      <div className=\"acs-context-info\">
        <p>User: {context.userPrincipalName}</p>
        <p>Theme: {context.theme}</p>
        <p>Locale: {context.locale}</p>
        {context.teamId && (
          <p>Team: {context.teamName}</p>
        )}
        {context.channelId && (
          <p>Channel: {context.channelName}</p>
        )}
      </div>
      
      {/* Component content that uses Teams context */}
    </div>
  );
}
```

#### Context-Aware Features

Adapt your tab based on Teams context:

1. **Theme Adaptation**
   - Respond to Teams theme changes
   - Support light, dark, and high contrast themes

```javascript
// Example: Theme-aware component
function ThemeAwareComponent() {
  const [theme, setTheme] = useState('default');
  
  useEffect(() => {
    // Initialize Teams SDK
    microsoftTeams.initialize();
    
    // Get initial theme
    microsoftTeams.getContext((context) => {
      setTheme(context.theme || 'default');
    });
    
    // Listen for theme changes
    microsoftTeams.registerOnThemeChangeHandler((newTheme) => {
      setTheme(newTheme || 'default');
    });
  }, []);
  
  // Apply theme class to container
  return (
    <div className={`acs-component acs-theme-${theme}`}>
      {/* Component content */}
    </div>
  );
}

// CSS for theme adaptation
const themeStyles = `
  /* Default theme (light) */
  .acs-component {
    --acs-bg-primary: #f5f5f5;
    --acs-bg-secondary: #ffffff;
    --acs-text-primary: #252525;
    --acs-text-secondary: #666666;
    --acs-accent-color: #6264a7;
    --acs-border-color: #e1e1e1;
  }
  
  /* Dark theme */
  .acs-theme-dark {
    --acs-bg-primary: #2d2c2c;
    --acs-bg-secondary: #201f1f;
    --acs-text-primary: #ffffff;
    --acs-text-secondary: #c8c8c8;
    --acs-accent-color: #6b69d6;
    --acs-border-color: #4b4a4a;
  }
  
  /* High contrast theme */
  .acs-theme-contrast {
    --acs-bg-primary: #000000;
    --acs-bg-secondary: #000000;
    --acs-text-primary: #ffffff;
    --acs-text-secondary: #ffffff;
    --acs-accent-color: #ffff00;
    --acs-border-color: #ffffff;
  }
`;
```

2. **User Context**
   - Personalize experiences based on user information
   - Respect user locale and language preferences

```javascript
// Example: Locale-aware component
import { IntlProvider, FormattedMessage, FormattedDate, FormattedNumber } from 'react-intl';

function LocaleAwareComponent() {
  const [locale, setLocale] = useState('en-US');
  const [messages, setMessages] = useState({});
  
  useEffect(() => {
    // Initialize Teams SDK
    microsoftTeams.initialize();
    
    // Get user locale
    microsoftTeams.getContext((context) => {
      const userLocale = context.locale || 'en-US';
      setLocale(userLocale);
      
      // Load locale-specific messages
      import(`./locales/${userLocale}.json`)
        .then((localeMessages) => {
          setMessages(localeMessages.default);
        })
        .catch((error) => {
          console.error(`Failed to load messages for locale ${userLocale}`, error);
          // Fall back to English
          import('./locales/en-US.json').then((defaultMessages) => {
            setMessages(defaultMessages.default);
          });
        });
    });
  }, []);
  
  return (
    <IntlProvider locale={locale} messages={messages}>
      <div className=\"acs-localized-content\">
        <h2>
          <FormattedMessage id=\"welcome\" defaultMessage=\"Welcome to ACS Communication\" />
        </h2>
        
        <p>
          <FormattedMessage 
            id=\"lastCallInfo\" 
            defaultMessage=\"Your last call was on {date} and lasted {duration} minutes.\"
            values={{
              date: <FormattedDate 
                value={new Date(2023, 5, 15)} 
                year=\"numeric\" 
                month=\"long\" 
                day=\"numeric\" 
              />,
              duration: <FormattedNumber value={42} />
            }}
          />
        </p>
      </div>
    </IntlProvider>
  );
}
```

### Teams Integration Features

#### Deep Linking

Implement Teams deep linking for seamless navigation:

```javascript
// Example: Teams deep linking
function TeamsNavigationLinks() {
  // Navigate to a Teams chat
  const openChat = (userId) => {
    microsoftTeams.executeDeepLink(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(userId)}`);
  };
  
  // Navigate to a Teams meeting
  const openMeeting = (meetingId) => {
    microsoftTeams.executeDeepLink(`https://teams.microsoft.com/l/meeting/0/0?meetingId=${encodeURIComponent(meetingId)}`);
  };
  
  // Navigate to a Teams app
  const openApp = (appId) => {
    microsoftTeams.executeDeepLink(`https://teams.microsoft.com/l/app/${encodeURIComponent(appId)}`);
  };
  
  return (
    <div className=\"acs-teams-navigation\">
      <h3>Quick Navigation</h3>
      <button onClick={() => openChat('user@example.com')}>
        Chat with Support
      </button>
      <button onClick={() => openMeeting('meetingId123')}>
        Join Technical Meeting
      </button>
      <button onClick={() => openApp('appId456')}>
        Open Documentation App
      </button>
    </div>
  );
}
```

#### Adaptive Cards

Use Adaptive Cards for rich, interactive content:

```javascript
// Example: Sending Adaptive Cards
function SendAdaptiveCard() {
  const sendCardToChat = () => {
    // Create an Adaptive Card payload
    const cardPayload = {
      \"$schema\": \"http://adaptivecards.io/schemas/adaptive-card.json\",
      \"type\": \"AdaptiveCard\",
      \"version\": \"1.3\",
      \"body\": [
        {
          \"type\": \"TextBlock\",
          \"size\": \"Medium\",
          \"weight\": \"Bolder\",
          \"text\": \"Communication Update\"
        },
        {
          \"type\": \"TextBlock\",
          \"text\": \"Your communication settings have been updated successfully.\",
          \"wrap\": true
        },
        {
          \"type\": \"FactSet\",
          \"facts\": [
            {
              \"title\": \"Updated by:\",
              \"value\": \"John Smith\"
            },
            {
              \"title\": \"Date:\",
              \"value\": \"April 15, 2023\"
            },
            {
              \"title\": \"Changes:\",
              \"value\": \"Audio device, notification preferences\"
            }
          ]
        }
      ],
      \"actions\": [
        {
          \"type\": \"Action.OpenUrl\",
          \"title\": \"View Details\",
          \"url\": \"https://teams.microsoft.com/l/entity/app-id/settings-tab\"
        },
        {
          \"type\": \"Action.Submit\",
          \"title\": \"Dismiss\",
          \"data\": {
            \"action\": \"dismiss\"
          }
        }
      ]
    };
    
    // Send the card to a chat
    microsoftTeams.tasks.startTask({
      card: JSON.stringify(cardPayload),
      width: 400,
      height: 400,
      title: \"Communication Update\",
      fallbackUrl: \"https://teams.microsoft.com\"
    }, (err, result) => {
      if (err) {
        console.error(\"Error sending card:\", err);
      } else {
        console.log(\"Card action result:\", result);
      }
    });
  };
  
  return (
    <button className=\"acs-send-card-button\" onClick={sendCardToChat}>
      Send Update Notification
    </button>
  );
}
```

## Accessibility Considerations

### WCAG Compliance

#### Core Requirements

Ensure your ACS Tabs meet the following Web Content Accessibility Guidelines (WCAG) 2.1 Level AA requirements:

1. **Perceivable**
   - Provide text alternatives for non-text content
   - Provide captions and alternatives for multimedia
   - Create content that can be presented in different ways
   - Make it easier for users to see and hear content

2. **Operable**
   - Make all functionality available from a keyboard
   - Give users enough time to read and use content
   - Do not use content that causes seizures
   - Help users navigate and find content

3. **Understandable**
   - Make text readable and understandable
   - Make content appear and operate in predictable ways
   - Help users avoid and correct mistakes

4. **Robust**
   - Maximize compatibility with current and future user tools

```javascript
// Example: Accessible tab component
function AccessibleTabGroup({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);
  
  // Handle keyboard navigation within tabs
  const handleKeyDown = (e, index) => {
    let newIndex;
    
    switch (e.key) {
      case 'ArrowRight':
        newIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    setActiveTab(newIndex);
    tabRefs.current[newIndex].focus();
  };
  
  return (
    <div className=\"acs-accessible-tabs\">
      <div 
        role=\"tablist\" 
        aria-label=\"Communication settings\"
        className=\"acs-tabs-list\"
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            role=\"tab\"
            id={`tab-${index}`}
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => (tabRefs.current[index] = el)}
            className={`acs-tab ${activeTab === index ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {tabs.map((tab, index) => (
        <div
          key={index}
          role=\"tabpanel\"
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
          className=\"acs-tab-panel\"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Keyboard Navigation

#### Focus Management

Implement proper keyboard focus management:

- Use a logical tab order (tabindex)
- Provide visible focus indicators
- Manage focus during dynamic content changes
- Trap focus in modal dialogs

```javascript
// Example: Focus management in modals
function AccessibleModal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const focusableElements = useRef([]);
  const previousActiveElement = useRef(null);
  
  // Set up focus trap when modal opens
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      modalRef.current.focus();
      
      // Find all focusable elements in the modal
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])';
      focusableElements.current = Array.from(
        modalRef.current.querySelectorAll(selector)
      );
      
      // Focus the first element if available
      if (focusableElements.current.length > 0) {
        focusableElements.current[0].focus();
      }
      
      // Add ESC key handler
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          // Trap focus within modal
          const firstElement = focusableElements.current[0];
          const lastElement = focusableElements.current[focusableElements.current.length - 1];
          
          // If shift + tab on first element, move to last element
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
          // If tab on last element, move to first element
          else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus when modal closes
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className=\"acs-modal-overlay\" aria-hidden=\"true\">
      <div
        ref={modalRef}
        role=\"dialog\"
        aria-modal=\"true\"
        aria-labelledby=\"modal-title\"
        className=\"acs-modal\"
        tabIndex={-1}
      >
        <div className=\"acs-modal-header\">
          <h2 id=\"modal-title\">{title}</h2>
          <button
            className=\"acs-modal-close\"
            aria-label=\"Close modal\"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className=\"acs-modal-content\">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Screen Reader Support

#### ARIA Implementation

Use ARIA roles, states, and properties to enhance screen reader support:

```javascript
// Example: ARIA implementation in a notification component
function Notification({ message, type, onDismiss }) {
  return (
    <div 
      role=\"alert\" 
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`acs-notification acs-notification-${type}`}
    >
      <div className=\"acs-notification-icon\">
        {type === 'success' && <Icon iconName=\"CheckMark\" aria-hidden=\"true\" />}
        {type === 'error' && <Icon iconName=\"Error\" aria-hidden=\"true\" />}
        {type === 'warning' && <Icon iconName=\"Warning\" aria-hidden=\"true\" />}
        {type === 'info' && <Icon iconName=\"Info\" aria-hidden=\"true\" />}
      </div>
      <div className=\"acs-notification-content\">
        <span className=\"acs-notification-message\">{message}</span>
      </div>
      <button 
        className=\"acs-notification-dismiss\"
        aria-label=\"Dismiss notification\"
        onClick={onDismiss}
      >
        <Icon iconName=\"Cancel\" aria-hidden=\"true\" />
      </button>
    </div>
  );
}
```

#### Dynamic Content Updates

Properly announce dynamic content changes to screen readers:

```javascript
// Example: Live region for dynamic updates
function LiveAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  
  // Add a new announcement
  const announce = (message, priority = 'polite') => {
    const id = Date.now();
    setAnnouncements(prevAnnouncements => [
      ...prevAnnouncements,
      { id, message, priority }
    ]);
    
    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prevAnnouncements => 
        prevAnnouncements.filter(announcement => announcement.id !== id)
      );
    }, 5000);
  };
  
  return (
    <>
      {/* Polite announcements (don't interrupt screen reader) */}
      <div 
        aria-live=\"polite\" 
        aria-atomic=\"true\" 
        className=\"acs-sr-only\"
      >
        {announcements
          .filter(announcement => announcement.priority === 'polite')
          .map(announcement => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </div>
      
      {/* Assertive announcements (interrupt screen reader) */}
      <div 
        aria-live=\"assertive\" 
        aria-atomic=\"true\" 
        className=\"acs-sr-only\"
      >
        {announcements
          .filter(announcement => announcement.priority === 'assertive')
          .map(announcement => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </div>
    </>
  );
}

// CSS for screen reader only elements
const srOnlyStyles = `
  .acs-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
```

## Localization and Internationalization

### Multi-language Support

#### Resource Files

Organize localized strings in resource files:

```javascript
// Example: Resource file structure
// en-US.json
{
  \"common\": {
    \"save\": \"Save\",
    \"cancel\": \"Cancel\",
    \"delete\": \"Delete\",
    \"loading\": \"Loading...\"
  },
  \"calls\": {
    \"title\": \"Calls\",
    \"startCall\": \"Start Call\",
    \"endCall\": \"End Call\",
    \"mute\": \"Mute\",
    \"unmute\": \"Unmute\"
  },
  \"settings\": {
    \"title\": \"Settings\",
    \"language\": \"Language\",
    \"notifications\": \"Notifications\",
    \"privacy\": \"Privacy\"
  },
  \"errors\": {
    \"general\": \"Something went wrong. Please try again.\",
    \"connection\": \"Connection error. Please check your network.\",
    \"permission\": \"Permission denied. Please enable microphone and camera access.\"
  }
}

// es-ES.json
{
  \"common\": {
    \"save\": \"Guardar\",
    \"cancel\": \"Cancelar\",
    \"delete\": \"Eliminar\",
    \"loading\": \"Cargando...\"
  },
  \"calls\": {
    \"title\": \"Llamadas\",
    \"startCall\": \"Iniciar Llamada\",
    \"endCall\": \"Finalizar Llamada\",
    \"mute\": \"Silenciar\",
    \"unmute\": \"Activar Sonido\"
  },
  \"settings\": {
    \"title\": \"Configuración\",
    \"language\": \"Idioma\",
    \"notifications\": \"Notificaciones\",
    \"privacy\": \"Privacidad\"
  },
  \"errors\": {
    \"general\": \"Algo salió mal. Por favor, inténtalo de nuevo.\",
    \"connection\": \"Error de conexión. Por favor, comprueba tu red.\",
    \"permission\": \"Permiso denegado. Por favor, habilita el acceso al micrófono y la cámara.\"
  }
}
```

#### Internationalization Library

Use a robust internationalization library like react-intl:

```javascript
// Example: Internationalization with react-intl
import React, { useState, useEffect } from 'react';
import { IntlProvider, FormattedMessage, useIntl } from 'react-intl';
import * as microsoftTeams from '@microsoft/teams-js';

// Language resource import
const loadLocaleData = async (locale) => {
  try {
    return await import(`./locales/${locale}.json`);
  } catch (error) {
    console.warn(`Failed to load locale data for ${locale}, falling back to en-US`);
    return await import('./locales/en-US.json');
  }
};

// Root component with IntlProvider
function LocalizedApp() {
  const [locale, setLocale] = useState('en-US');
  const [messages, setMessages] = useState(null);
  
  useEffect(() => {
    // Initialize Teams SDK
    microsoftTeams.initialize();
    
    // Get user locale from Teams context
    microsoftTeams.getContext((context) => {
      const userLocale = context.locale || 'en-US';
      setLocale(userLocale);
      
      // Load locale data
      loadLocaleData(userLocale).then((data) => {
        setMessages(data.default || data);
      });
    });
  }, []);
  
  if (!messages) {
    return <div>Loading...</div>;
  }
  
  return (
    <IntlProvider locale={locale} messages={messages}>
      <ACSTabContent />
    </IntlProvider>
  );
}

// Component using translations
function ACSTabContent() {
  const intl = useIntl();
  
  // Use intl.formatMessage for dynamic strings
  const placeholderText = intl.formatMessage(
    { id: 'calls.searchPlaceholder', defaultMessage: 'Search calls...' }
  );
  
  return (
    <div className=\"acs-tab-content\">
      <h1>
        <FormattedMessage
          id=\"calls.title\"
          defaultMessage=\"Calls\"
        />
      </h1>
      
      <div className=\"acs-search\">
        <input 
          type=\"text\" 
          placeholder={placeholderText} 
          aria-label={placeholderText}
        />
      </div>
      
      <div className=\"acs-actions\">
        <button className=\"acs-primary-button\">
          <FormattedMessage
            id=\"calls.startCall\"
            defaultMessage=\"Start Call\"
          />
        </button>
      </div>
      
      {/* Error message with variables */}
      <FormattedMessage
        id=\"errors.limit\"
        defaultMessage=\"You have {count, number} {count, plural, one {call} other {calls}} remaining today.\"
        values={{ count: 3 }}
      />
    </div>
  );
}
```

### Localization Best Practices

1. **Extract All User-Facing Strings**
   - Don't hardcode text in components
   - Include placeholder text, button labels, error messages
   - Consider pluralization and grammatical differences

2. **Handle Date, Time, and Number Formats**
   - Use locale-aware formatting
   - Consider time zones
   - Use appropriate number formats (decimal separators, currency)

```javascript
// Example: Locale-aware formatting
function LocalizedCallDetails({ call }) {
  const intl = useIntl();
  
  return (
    <div className=\"acs-call-details\">
      <h3>{call.title}</h3>
      
      {/* Date formatting */}
      <div className=\"acs-call-time\">
        <FormattedMessage
          id=\"calls.scheduledFor\"
          defaultMessage=\"Scheduled for {date}\"
          values={{
            date: intl.formatDate(call.scheduledTime, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            })
          }}
        />
      </div>
      
      {/* Duration formatting */}
      <div className=\"acs-call-duration\">
        <FormattedMessage
          id=\"calls.estimatedDuration\"
          defaultMessage=\"Estimated duration: {duration}\"
          values={{
            duration: intl.formatNumber(call.durationMinutes, {
              style: 'unit',
              unit: 'minute'
            })
          }}
        />
      </div>
      
      {/* Number formatting */}
      <div className=\"acs-call-participants\">
        <FormattedMessage
          id=\"calls.participantsCount\"
          defaultMessage=\"{count, number} {count, plural, one {participant} other {participants}}\"
          values={{ count: call.participants.length }}
        />
      </div>
    </div>
  );
}
```

3. **Support Right-to-Left (RTL) Languages**
   - Use logical properties (start/end) instead of directional (left/right)
   - Set dir attribute based on locale
   - Test with RTL languages like Arabic and Hebrew

```css
/* Example: RTL support with logical properties */
/* Instead of this: */
.acs-button-icon {
  margin-right: 8px;
}

/* Use this: */
.acs-button-icon {
  margin-inline-end: 8px; /* Respects reading direction */
}

/* Full RTL-compatible stylesheet */
.acs-navigation {
  display: flex;
  flex-direction: row;
  padding-inline-start: 16px;
  padding-inline-end: 16px;
}

.acs-navigation-item {
  margin-inline-end: 8px;
}

.acs-content {
  text-align: start;
}

.acs-panel {
  border-inline-start: 1px solid var(--colorNeutralStroke1);
}

/* Apply RTL attributes */
.acs-rtl-aware {
  direction: var(--direction, ltr);
}
```

## Testing and Validation

### Testing Strategies

#### Component Testing

Test individual components with Jest and React Testing Library:

```javascript
// Example: Component testing
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CallButton from './CallButton';

describe('CallButton', () => {
  test('renders correctly with default props', () => {
    render(<CallButton label=\"Start Call\" />);
    expect(screen.getByText('Start Call')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
  
  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<CallButton label=\"Start Call\" onClick={handleClick} />);
    
    userEvent.click(screen.getByText('Start Call'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('renders in disabled state when disabled prop is true', () => {
    render(<CallButton label=\"Start Call\" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  test('displays loading state when loading prop is true', () => {
    render(<CallButton label=\"Start Call\" loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Start Call')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Integration Testing

Test component interactions with Cypress:

```javascript
// Example: Cypress integration test
describe('ACS Tab', () => {
  beforeEach(() => {
    // Mock Teams context
    cy.window().then((win) => {
      win.microsoftTeams = {
        initialize: cy.stub().as('teamsInitialize'),
        getContext: cy.stub().callsFake((callback) => {
          callback({
            theme: 'default',
            locale: 'en-us',
            userObjectId: 'user123',
            userPrincipalName: 'user@example.com'
          });
        })
      };
    });
    
    // Visit the tab page
    cy.visit('/tab.html');
  });
  
  it('should initialize Teams SDK', () => {
    cy.get('@teamsInitialize').should('have.been.called');
  });
  
  it('should display communication controls', () => {
    cy.get('.acs-communication-controls').should('be.visible');
    cy.get('[data-testid=\"start-call-button\"]').should('be.visible');
    cy.get('[data-testid=\"settings-button\"]').should('be.visible');
  });
  
  it('should open settings panel when settings button is clicked', () => {
    cy.get('[data-testid=\"settings-button\"]').click();
    cy.get('.acs-settings-panel').should('be.visible');
    cy.get('[data-testid=\"close-settings-button\"]').should('be.visible');
  });
  
  it('should start a call when start call button is clicked', () => {
    // Mock ACS call client
    cy.window().then((win) => {
      win.callClient = {
        startCall: cy.stub().as('startCall').resolves({
          id: 'call123',
          state: 'connecting'
        })
      };
    });
    
    cy.get('[data-testid=\"start-call-button\"]').click();
    cy.get('@startCall').should('have.been.called');
    cy.get('.acs-call-interface').should('be.visible');
    cy.get('.acs-call-status').should('contain', 'Connecting');
  });
});
```

#### Accessibility Testing

Test accessibility with axe and manual checks:

```javascript
// Example: Accessibility testing with jest-axe
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TabNavigation from './TabNavigation';

expect.extend(toHaveNoViolations);

describe('TabNavigation accessibility', () => {
  it('should not have accessibility violations', async () => {
    const tabs = [
      { id: 'tab1', label: 'Calls', content: <div>Calls content</div> },
      { id: 'tab2', label: 'Meetings', content: <div>Meetings content</div> },
      { id: 'tab3', label: 'Settings', content: <div>Settings content</div> }
    ];
    
    const { container } = render(
      <TabNavigation 
        tabs={tabs} 
        activeTab=\"tab1\" 
        onTabChange={() => {}}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Cross-Platform Testing

Test your tab on all Teams clients:

1. **Desktop Testing**
   - Windows (Teams app)
   - macOS (Teams app)
   - Browser (Chrome, Edge, Firefox, Safari)

2. **Mobile Testing**
   - iOS (Phone and tablet)
   - Android (Phone and tablet)
   - Different screen sizes and orientations

3. **Platform-Specific Considerations**
   - Touch vs. mouse/keyboard interactions
   - Screen reader behavior
   - Performance characteristics
   - Platform-specific UI conventions

## Implementation Examples

### Complete Design Patterns

#### Communication Controls

```javascript
// Example: Communication controls component
import React, { useState, useEffect } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { CallClient } from '@azure/communication-calling';

// Initialize Fluent UI icons
initializeIcons();

function CommunicationControls({ userId, displayName }) {
  const [callState, setCallState] = useState('disconnected'); // disconnected, connecting, connected
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [call, setCall] = useState(null);
  const [callClient, setCallClient] = useState(null);
  
  // Initialize call client
  useEffect(() => {
    async function initCallClient() {
      try {
        const client = new CallClient();
        setCallClient(client);
      } catch (error) {
        console.error(\"Failed to initialize call client:\", error);
      }
    }
    
    initCallClient();
  }, []);
  
  // Start a call
  const startCall = async (recipientId) => {
    if (!callClient) return;
    
    try {
      setCallState('connecting');
      
      // Call setup logic with ACS SDK
      const callAgent = await callClient.createCallAgent(/* credentials */);
      const newCall = callAgent.startCall([{ id: recipientId }], { audioOptions: { muted: false } });
      
      setCall(newCall);
      
      // Set up call state change handler
      newCall.on('stateChanged', () => {
        setCallState(newCall.state);
      });
      
    } catch (error) {
      console.error(\"Failed to start call:\", error);
      setCallState('disconnected');
    }
  };
  
  // End the current call
  const endCall = async () => {
    if (call) {
      try {
        await call.hangUp();
        setCallState('disconnected');
        setCall(null);
      } catch (error) {
        console.error(\"Failed to end call:\", error);
      }
    }
  };
  
  // Toggle mute state
  const toggleMute = async () => {
    if (call) {
      try {
        if (isMuted) {
          await call.unmute();
        } else {
          await call.mute();
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.error(\"Failed to toggle mute:\", error);
      }
    }
  };
  
  // Toggle video
  const toggleVideo = async () => {
    if (call) {
      try {
        if (isVideoEnabled) {
          await call.stopVideo();
        } else {
          await call.startVideo();
        }
        setIsVideoEnabled(!isVideoEnabled);
      } catch (error) {
        console.error(\"Failed to toggle video:\", error);
      }
    }
  };
  
  // Toggle screen sharing
  const toggleScreenSharing = async () => {
    if (call) {
      try {
        if (isScreenSharing) {
          await call.stopScreenSharing();
        } else {
          await call.startScreenSharing();
        }
        setIsScreenSharing(!isScreenSharing);
      } catch (error) {
        console.error(\"Failed to toggle screen sharing:\", error);
      }
    }
  };
  
  return (
    <div className=\"acs-communication-controls\">
      {callState === 'disconnected' ? (
        <button 
          className=\"acs-start-call-button\"
          onClick={() => startCall('recipient-id')}
          aria-label=\"Start call\"
        >
          <Icon iconName=\"Phone\" aria-hidden=\"true\" />
          <span>Start Call</span>
        </button>
      ) : (
        <div className=\"acs-active-call-controls\">
          <div className=\"acs-call-status\">
            {callState === 'connecting' ? 'Connecting...' : 'Connected'}
          </div>
          
          <div className=\"acs-call-buttons\">
            <button 
              className={`acs-control-button ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              aria-pressed={isMuted}
            >
              <Icon iconName={isMuted ? 'MicOff' : 'Microphone'} aria-hidden=\"true\" />
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            
            <button 
              className={`acs-control-button ${isVideoEnabled ? 'active' : ''}`}
              onClick={toggleVideo}
              aria-label={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
              aria-pressed={isVideoEnabled}
            >
              <Icon iconName={isVideoEnabled ? 'VideoOff' : 'Video'} aria-hidden=\"true\" />
              <span>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
            </button>
            
            <button 
              className={`acs-control-button ${isScreenSharing ? 'active' : ''}`}
              onClick={toggleScreenSharing}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              aria-pressed={isScreenSharing}
            >
              <Icon iconName=\"ScreenShare\" aria-hidden=\"true\" />
              <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
            </button>
            
            <button 
              className=\"acs-end-call-button\"
              onClick={endCall}
              aria-label=\"End call\"
            >
              <Icon iconName=\"DeclineCall\" aria-hidden=\"true\" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationControls;
```

#### User Presence Indicator

```javascript
// Example: User presence indicator component
import React, { useEffect, useState } from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import { Tooltip } from '@fluentui/react/lib/Tooltip';

function UserPresenceIndicator({ userId, showDetails = false }) {
  const [presence, setPresence] = useState('unknown');
  const [activity, setActivity] = useState('');
  const [lastSeen, setLastSeen] = useState(null);
  
  // Get and subscribe to user presence
  useEffect(() => {
    // Mock presence service - replace with actual implementation
    const mockFetchPresence = () => {
      // Simulate API call to get presence
      setTimeout(() => {
        // Sample presence data
        const presenceData = {
          status: 'available', // available, busy, doNotDisturb, away, offline, unknown
          activity: 'In a meeting',
          lastSeen: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        };
        
        setPresence(presenceData.status);
        setActivity(presenceData.activity);
        setLastSeen(presenceData.lastSeen);
      }, 500);
    };
    
    // Initial fetch
    mockFetchPresence();
    
    // Set up polling for updates
    const intervalId = setInterval(mockFetchPresence, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [userId]);
  
  // Determine icon and color based on presence
  const getPresenceIcon = () => {
    switch (presence) {
      case 'available':
        return { icon: 'PresenceAvailable', color: '#6BB700' };
      case 'busy':
      case 'doNotDisturb':
        return { icon: 'PresenceDnd', color: '#C4314B' };
      case 'away':
        return { icon: 'PresenceAway', color: '#FFAA44' };
      case 'offline':
        return { icon: 'PresenceOffline', color: '#8A8886' };
      default:
        return { icon: 'PresenceUnknown', color: '#8A8886' };
    }
  };
  
  // Format presence for accessibility
  const getAccessiblePresence = () => {
    switch (presence) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'doNotDisturb':
        return 'Do not disturb';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
      default:
        return 'Presence unknown';
    }
  };
  
  // Format last seen time
  const formatLastSeen = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };
  
  const { icon, color } = getPresenceIcon();
  const accessiblePresence = getAccessiblePresence();
  
  // Render simple or detailed indicator based on showDetails
  if (!showDetails) {
    return (
      <Tooltip content={accessiblePresence}>
        <span 
          className=\"acs-presence-indicator\" 
          aria-label={accessiblePresence}
        >
          <Icon 
            iconName={icon} 
            style={{ color }} 
            aria-hidden=\"true\" 
          />
        </span>
      </Tooltip>
    );
  }
  
  return (
    <div className=\"acs-presence-details\">
      <div className=\"acs-presence-status\">
        <Icon 
          iconName={icon} 
          style={{ color }} 
          aria-hidden=\"true\" 
        />
        <span aria-label={accessiblePresence}>{accessiblePresence}</span>
      </div>
      
      {activity && (
        <div className=\"acs-presence-activity\">
          {activity}
        </div>
      )}
      
      {lastSeen && presence === 'offline' && (
        <div className=\"acs-presence-last-seen\">
          Last seen {formatLastSeen(lastSeen)}
        </div>
      )}
    </div>
  );
}

export default UserPresenceIndicator;
```

## Resources

### Official Documentation

- [Microsoft Teams Developer Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs)
- [Azure Communication Services Documentation](https://learn.microsoft.com/en-us/azure/communication-services/)
- [Fluent UI React Documentation](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/overview)
- [Adaptive Cards Documentation](https://adaptivecards.io/)

### Design Resources

- [Microsoft Teams UI Kit for Figma](https://www.figma.com/community/file/916836509871353159/Microsoft-Teams-UI-Kit)
- [Fluent UI Design System](https://www.microsoft.com/design/fluent/)
- [Microsoft Accessibility Insights](https://accessibilityinsights.io/)
- [Color Contrast Analyzer](https://developer.paciellogroup.com/color-contrast-checker/)
- [Axe DevTools](https://www.deque.com/axe/)

### Development Tools

- [Teams Toolkit for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
- [Teams Toolkit CLI](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-cli)
- [AppSource Submission Tool](https://seller.microsoft.com/en-us/dashboard/registration/seller)
- [Teams App Validation Tool](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-app-validation-tool)
- [Teams Developer Portal](https://dev.teams.microsoft.com/)

### Community Support

- [Microsoft Teams Developer Community](https://techcommunity.microsoft.com/t5/microsoft-teams-community/ct-p/MicrosoftTeams)
- [Microsoft Q&A for Teams](https://docs.microsoft.com/en-us/answers/topics/teams-development.html)
- [Stack Overflow - Microsoft Teams](https://stackoverflow.com/questions/tagged/microsoft-teams)
- [GitHub - Microsoft Teams Samples](https://github.com/OfficeDev/Microsoft-Teams-Samples)
`
}