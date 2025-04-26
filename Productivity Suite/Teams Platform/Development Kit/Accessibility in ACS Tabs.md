# Accessibility in ACS Tabs

## Overview

Accessibility is a critical component of Azure Communication Services (ACS) Tab development, ensuring that all users, regardless of their abilities, can effectively use and interact with ACS Tab applications within Microsoft Teams. This document provides comprehensive guidelines, best practices, and implementation details for developing accessible ACS Tabs.

## Table of Contents

- [Accessibility Requirements](#accessibility-requirements)
- [WCAG 2.1 Compliance](#wcag-21-compliance)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Color and Contrast](#color-and-contrast)
- [Responsive Design](#responsive-design)
- [Testing and Validation](#testing-and-validation)
- [Implementation Examples](#implementation-examples)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Accessibility Requirements

### Legal and Compliance Requirements

ACS Tabs must comply with the following standards and regulations:

- Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
- Americans with Disabilities Act (ADA)
- Section 508 of the Rehabilitation Act
- European Accessibility Act (EAA)
- Microsoft Teams accessibility requirements

### Microsoft Teams-Specific Requirements

- Tab applications must seamlessly integrate with Teams' built-in accessibility features
- Tab focus management must be compatible with Teams' navigation patterns
- All interactive elements must be operable via keyboard and assistive technologies
- Tabs must maintain accessibility across various Teams clients (desktop, web, mobile)

## WCAG 2.1 Compliance

ACS Tabs must adhere to the following WCAG 2.1 principles:

### Perceivable

- Provide text alternatives for non-text content
- Provide captions and alternatives for multimedia
- Create content that can be presented in different ways
- Make it easier for users to see and hear content

Implementation:
```javascript
// Example: Adding alternative text to images
<img src="communication-icon.png" alt="Communication service status indicator showing online status" />

// Example: Providing captions for video content
<video controls>
  <source src="acs-demo.mp4" type="video/mp4" />
  <track kind="captions" src="acs-demo-captions.vtt" srclang="en" label="English" />
</video>
```

### Operable

- All functionality must be available from a keyboard
- Provide users enough time to read and use content
- Do not use content that causes seizures
- Help users navigate and find content

Implementation:
```javascript
// Example: Ensuring keyboard accessibility for custom controls
const CustomButton = () => {
  return (
    <div 
      role="button" 
      tabIndex={0} 
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Trigger button action
          handleButtonAction();
        }
      }}
      onClick={handleButtonAction}
      aria-label="Start communication"
    >
      Start Communication
    </div>
  );
};
```

### Understandable

- Make text readable and understandable
- Make content appear and operate in predictable ways
- Help users avoid and correct mistakes

Implementation:
```javascript
// Example: Providing clear error messages
const FormField = () => {
  const [error, setError] = useState('');
  
  return (
    <div>
      <label htmlFor="username">Username:</label>
      <input 
        id="username" 
        type="text"
        aria-describedby="username-error"
        aria-invalid={error ? 'true' : 'false'}
      />
      {error && <div id="username-error" role="alert">{error}</div>}
    </div>
  );
};
```

### Robust

- Maximize compatibility with current and future user tools
- Ensure proper DOM structure and ARIA usage

Implementation:
```javascript
// Example: Using semantic HTML5 elements
<nav aria-label="Main navigation">
  <ul>
    <li><a href="#dashboard">Dashboard</a></li>
    <li><a href="#calls">Calls</a></li>
    <li><a href="#settings">Settings</a></li>
  </ul>
</nav>

// Example: Using ARIA roles when needed
<div role="tablist">
  <button role="tab" aria-selected="true" id="tab1">Messages</button>
  <button role="tab" aria-selected="false" id="tab2">Participants</button>
</div>
<div role="tabpanel" aria-labelledby="tab1">Messages content</div>
<div role="tabpanel" aria-labelledby="tab2" hidden>Participants content</div>
```

## Keyboard Navigation

ACS Tabs must be fully operable using only a keyboard, with the following requirements:

### Focus Management

- Implement logical tab order (tabindex)
- Provide visible focus indicators
- Trap focus appropriately in modals and dialogs
- Manage focus when content changes dynamically

Implementation:
```javascript
// Example: Managing focus in modal dialogs
const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      // Store previous active element
      const previousActiveElement = document.activeElement;
      
      // Focus the modal when opened
      modalRef.current.focus();
      
      // Restore focus when closed
      return () => {
        previousActiveElement.focus();
      };
    }
  }, [isOpen]);
  
  return isOpen ? (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      // Focus trap implementation
    >
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
};
```

### Keyboard Shortcuts

- Implement standard keyboard shortcuts where appropriate
- Avoid conflicts with Teams and browser keyboard shortcuts
- Document all custom keyboard shortcuts
- Allow customization of shortcuts when possible

Standard Shortcuts for ACS Tabs:
- Enter/Space: Activate buttons and interactive elements
- Tab/Shift+Tab: Navigate between focusable elements
- Arrow keys: Navigate within composite components
- Escape: Close dialogs, cancel actions
- Ctrl+F: Open search within the tab

## Screen Reader Support

ACS Tabs must be compatible with popular screen readers including:

- NVDA
- JAWS
- VoiceOver
- Narrator
- TalkBack (for mobile)

### Implementation Requirements

- Use semantic HTML elements whenever possible
- Implement ARIA roles, states, and properties correctly
- Provide meaningful text alternatives
- Announce dynamic content changes

Implementation:
```javascript
// Example: Announcing dynamic content changes
const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  
  // When a new notification arrives
  const addNotification = (message) => {
    setNotifications([...notifications, message]);
    
    // Announce to screen readers
    const liveRegion = document.getElementById('notification-live-region');
    liveRegion.textContent = message;
  };
  
  return (
    <>
      <div 
        id="notification-live-region" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      ></div>
      
      <div className="notifications-container">
        {notifications.map((notification, index) => (
          <div key={index} className="notification">{notification}</div>
        ))}
      </div>
    </>
  );
};
```

### Testing Requirements

- Test with each screen reader on relevant platforms
- Verify all interactive elements are properly announced
- Ensure dynamic content changes are announced appropriately
- Validate proper heading structure and landmark regions

## Color and Contrast

### Contrast Requirements

- Text and interactive elements must have a contrast ratio of at least 4.5:1
- Large text (18pt or 14pt bold) must have a contrast ratio of at least 3:1
- User interface components and graphical objects must have a contrast ratio of at least 3:1

Implementation:
```css
/* Example: Ensuring sufficient color contrast */
.primary-button {
  /* WCAG AA compliant - 4.5:1 contrast ratio */
  background-color: #005A9E; 
  color: #FFFFFF;
}

.secondary-button {
  /* WCAG AA compliant - 4.5:1 contrast ratio */
  background-color: #FFFFFF;
  color: #005A9E;
  border: 2px solid #005A9E;
}

.disabled-button {
  /* WCAG AA compliant - 4.5:1 contrast ratio */
  background-color: #CCCCCC;
  color: #525252;
}
```

### Color Independence

- Do not use color alone to convey information
- Provide additional indicators (text, icons, patterns)
- Support high contrast modes

Implementation:
```javascript
// Example: Not relying solely on color for status indicators
const StatusIndicator = ({ status }) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'online':
        return {
          label: 'Online',
          color: '#107C10',
          icon: '●',
          backgroundColor: '#DFFFD3'
        };
      case 'away':
        return {
          label: 'Away',
          color: '#FF8C00',
          icon: '◐',
          backgroundColor: '#FFEBD3'
        };
      case 'offline':
        return {
          label: 'Offline',
          color: '#5A5A5A',
          icon: '○',
          backgroundColor: '#F0F0F0'
        };
      default:
        return {
          label: 'Unknown',
          color: '#5A5A5A',
          icon: '?',
          backgroundColor: '#F0F0F0'
        };
    }
  };
  
  const statusDetails = getStatusDetails();
  
  return (
    <div 
      className="status-indicator"
      style={{ backgroundColor: statusDetails.backgroundColor }}
      aria-label={`Status: ${statusDetails.label}`}
    >
      <span 
        className="status-icon"
        style={{ color: statusDetails.color }}
        aria-hidden="true"
      >
        {statusDetails.icon}
      </span>
      <span className="status-label">{statusDetails.label}</span>
    </div>
  );
};
```

## Responsive Design

### Responsive Requirements

- Tab content must adapt to different screen sizes
- Support Teams' responsive design breakpoints
- Maintain accessibility across viewport sizes
- Support zoom levels up to 400%

Implementation:
```css
/* Example: Responsive design media queries */
/* Base styles for all screen sizes */
.acs-tab-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

/* Medium screens (Teams default) */
@media (min-width: 640px) {
  .acs-tab-container {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .acs-tab-section {
    width: 50%;
  }
}

/* Large screens */
@media (min-width: 1024px) {
  .acs-tab-section {
    width: 33.33%;
  }
}

/* High zoom support */
@media (max-width: 320px) {
  .acs-tab-container {
    font-size: 16px;
    line-height: 1.5;
  }
  
  .acs-tab-button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Touch Target Sizes

- Interactive elements must be at least 44x44 pixels
- Provide adequate spacing between touch targets
- Support touch gestures with appropriate feedback

## Testing and Validation

### Automated Testing

Tools for automated accessibility testing:

- Axe DevTools
- Lighthouse
- Microsoft Accessibility Insights
- WAVE Web Accessibility Evaluation Tool
- jest-axe for component testing

Implementation:
```javascript
// Example: Automated testing with jest-axe
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TabComponent from './TabComponent';

expect.extend(toHaveNoViolations);

describe('TabComponent accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<TabComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing

- Keyboard-only navigation testing
- Screen reader testing
- High contrast mode testing
- Zoom testing (up to 400%)
- Mobile and touch device testing

### Validation Checklist

Before deployment, verify:

- All interactive elements are keyboard accessible
- Proper heading structure (h1-h6)
- ARIA attributes are used correctly
- Color contrast meets requirements
- Alternative text for images
- Form labels and instructions
- Error handling and validation
- Focus management

## Implementation Examples

### Accessible Tab Interface

```javascript
// Accessible tab interface implementation
import React, { useState } from 'react';

const AccessibleTabs = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div className="accessible-tabs">
      <div role="tablist" aria-label="Communication options">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            id={`tab-${index}`}
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => {
              // Arrow key navigation
              if (e.key === 'ArrowRight') {
                setActiveTab((activeTab + 1) % tabs.length);
              } else if (e.key === 'ArrowLeft') {
                setActiveTab((activeTab - 1 + tabs.length) % tabs.length);
              }
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>
      
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`tabpanel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

export default AccessibleTabs;
```

### Accessible Dialog

```javascript
// Accessible dialog implementation
import React, { useEffect, useRef } from 'react';

const AccessibleDialog = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef(null);
  const previouslyFocusedElement = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previouslyFocusedElement.current = document.activeElement;
      
      // Focus the dialog
      dialogRef.current.focus();
      
      // Add event listener for escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="dialog-overlay" aria-hidden="true">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="dialog"
        tabIndex={-1}
      >
        <header>
          <h2 id="dialog-title">{title}</h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="close-button"
          >
            ×
          </button>
        </header>
        <div className="dialog-content">
          {children}
        </div>
        <div className="dialog-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AccessibleDialog;
```

## Troubleshooting

### Common Accessibility Issues and Solutions

| Issue | Solution |
|-------|----------|
| Missing alternative text | Add appropriate `alt` attributes to all images |
| Insufficient color contrast | Adjust color palette to meet WCAG contrast requirements |
| Keyboard trap | Ensure focus can move in and out of all components |
| Missing form labels | Add explicit labels for all form controls |
| Non-descriptive links | Use descriptive link text instead of "click here" |
| Complex components lacking ARIA | Implement appropriate ARIA roles and attributes |
| Inaccessible custom controls | Ensure all custom controls have keyboard support |
| Missing focus indicators | Add visible focus states for all interactive elements |
| Dynamic content not announced | Use ARIA live regions for important updates |

### Debugging Tools

- Browser DevTools Accessibility panels
- Screen reader debugging modes
- ARIA validator tools
- Focus indicator trackers

## Resources

### Official Documentation

- [Microsoft Teams Accessibility Guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/design/accessibility)
- [Azure Communication Services Documentation](https://learn.microsoft.com/en-us/azure/communication-services/)
- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Tools and Libraries

- [Fluent UI Accessibility](https://developer.microsoft.com/en-us/fluentui#/accessibility)
- [React-Aria](https://react-spectrum.adobe.com/react-aria/)
- [Axe DevTools](https://www.deque.com/axe/)
- [Accessibility Insights](https://accessibilityinsights.io/)

### Training Resources

- [Microsoft Learn Accessibility Modules](https://docs.microsoft.com/en-us/learn/paths/accessibility-fundamentals/)
- [Web Accessibility Initiative (WAI) Tutorials](https://www.w3.org/WAI/tutorials/)
- [Deque University](https://dequeuniversity.com/)

### Community Support

- [Microsoft Q&A for Teams Development](https://docs.microsoft.com/en-us/answers/topics/microsoft-teams-development.html)
- [Stack Overflow - Teams Development](https://stackoverflow.com/questions/tagged/microsoft-teams)
- [Accessibility Slack Communities](https://www.a11y-collective.com/accessibility-slack-communities/)
