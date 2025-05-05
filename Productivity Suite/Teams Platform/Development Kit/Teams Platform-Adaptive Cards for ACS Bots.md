# Adaptive Cards for ACS Bots

## Overview

Adaptive Cards are a cross-platform framework for exchanging card content in a common and consistent way. They provide a powerful way to enhance Azure Communication Services (ACS) bots with rich, interactive UI elements while maintaining a consistent experience across platforms and devices.

Adaptive Cards allow developers to describe their content as a JSON object that can be rendered natively on different platforms and applications, including Teams, Outlook, Windows, and more. When integrated with ACS bots, Adaptive Cards enable sophisticated interactions beyond basic text messages.

## Key Benefits

- **Cross-platform compatibility**: Works seamlessly across Teams, Outlook, and other platforms
- **Rich interactive elements**: Supports buttons, input fields, images, and more
- **Consistent rendering**: Maintains visual consistency across different devices and platforms
- **Flexible design**: Adapts to different screen sizes and orientations
- **Low code approach**: JSON-based specification with clear schema
- **Reduced development time**: Reuse the same card across multiple platforms

## Getting Started with Adaptive Cards in ACS Bots

### Prerequisites

Before implementing Adaptive Cards in your ACS bots, ensure you have:

- An Azure account with active subscription
- Azure Communication Services resource set up
- Basic knowledge of Azure Bot Framework
- Node.js (v12 or later) or .NET Core (3.1 or later) development environment
- Bot Framework SDK installed

### Installation

For Node.js:

```bash
npm install adaptivecards
npm install @microsoft/adaptivecards-tools
npm install botbuilder
npm install @azure/communication-common
```

For .NET:

```bash
dotnet add package AdaptiveCards
dotnet add package Microsoft.Bot.Builder
dotnet add package Azure.Communication.Common
```

## Creating Adaptive Cards

### Basic Card Structure

Adaptive Cards are defined using JSON. Here's a basic structure:

```json
{
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "Hello, Adaptive Cards!",
      "size": "Large",
      "weight": "Bolder"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "OK",
      "data": {
        "actionType": "okAction"
      }
    }
  ]
}
```

### Common Card Elements

1. **TextBlock**: Displays text with various formatting options
2. **Image**: Displays an image with sizing and styling options
3. **ColumnSet**: Creates a set of columns for layout
4. **Container**: Groups items together
5. **FactSet**: Displays a series of facts (name/value pairs)
6. **Input.Text**: Collects text input from users
7. **Input.Number**: Collects numeric input from users
8. **Input.Date**: Collects date input from users
9. **Input.Toggle**: Provides a toggle switch
10. **Input.ChoiceSet**: Provides a set of choices (dropdown or radio buttons)

### Actions

Adaptive Cards support different types of actions:

- **Action.Submit**: Submits input data back to the bot
- **Action.OpenUrl**: Opens a URL in a browser
- **Action.ShowCard**: Shows another card
- **Action.ToggleVisibility**: Shows or hides elements on the card

## Integrating Adaptive Cards with ACS Bots

### Node.js Example

```javascript
const { AdaptiveCards } = require("adaptivecards");
const { BotFrameworkAdapter, ActivityHandler } = require("botbuilder");
const { CommunicationIdentityClient } = require("@azure/communication-identity");

class AdaptiveCardBot extends ActivityHandler {
  constructor() {
    super();
    this.onMessage(async (context, next) => {
      // Create an adaptive card
      const card = {
        type: "AdaptiveCard",
        version: "1.3",
        body: [
          {
            type: "TextBlock",
            text: "Please provide your information",
            size: "Medium",
            weight: "Bolder"
          },
          {
            type: "Input.Text",
            id: "name",
            label: "Name",
            placeholder: "Enter your name"
          },
          {
            type: "Input.Text",
            id: "email",
            label: "Email",
            placeholder: "Enter your email"
          }
        ],
        actions: [
          {
            type: "Action.Submit",
            title: "Submit",
            data: {
              actionType: "submitAction"
            }
          }
        ]
      };

      // Create an attachment from the adaptive card
      const attachment = {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card
      };

      // Send the adaptive card as an attachment
      await context.sendActivity({ attachments: [attachment] });
      
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity("Welcome! I'm a bot that uses Adaptive Cards.");
        }
      }
      await next();
    });
  }
}

module.exports.AdaptiveCardBot = AdaptiveCardBot;
```

### .NET Example

```csharp
using Microsoft.Bot.Builder;
using Microsoft.Bot.Schema;
using AdaptiveCards;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

public class AdaptiveCardBot : ActivityHandler
{
    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        // Create an adaptive card
        var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
        {
            Body = new List<AdaptiveElement>()
            {
                new AdaptiveTextBlock()
                {
                    Text = "Please provide your information",
                    Size = AdaptiveTextSize.Medium,
                    Weight = AdaptiveTextWeight.Bolder
                },
                new AdaptiveTextInput()
                {
                    Id = "name",
                    Label = "Name",
                    Placeholder = "Enter your name"
                },
                new AdaptiveTextInput()
                {
                    Id = "email",
                    Label = "Email",
                    Placeholder = "Enter your email"
                }
            },
            Actions = new List<AdaptiveAction>()
            {
                new AdaptiveSubmitAction()
                {
                    Title = "Submit",
                    Data = new { actionType = "submitAction" }
                }
            }
        };

        // Create an attachment from the adaptive card
        var attachment = new Attachment()
        {
            ContentType = "application/vnd.microsoft.card.adaptive",
            Content = JsonConvert.DeserializeObject(card.ToJson())
        };

        // Send the adaptive card as an attachment
        await turnContext.SendActivityAsync(MessageFactory.Attachment(attachment), cancellationToken);
    }

    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        foreach (var member in membersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(MessageFactory.Text("Welcome! I'm a bot that uses Adaptive Cards."), cancellationToken);
            }
        }
    }
}
```

## Handling Adaptive Card Input

### Processing Submitted Data

When a user interacts with an Adaptive Card, the data is sent back to your bot. You need to handle this data in your bot's message handler.

#### Node.js Example:

```javascript
this.onMessage(async (context, next) => {
  if (context.activity.value) {
    // This is a response from an Adaptive Card
    const data = context.activity.value;
    
    if (data.actionType === "submitAction") {
      // Process the submitted data
      const name = data.name;
      const email = data.email;
      
      // Respond to the user
      await context.sendActivity(`Thank you, ${name}! We'll contact you at ${email}.`);
    }
  } else {
    // Regular message handling
    // ...
  }
  
  await next();
});
```

#### .NET Example:

```csharp
protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
{
    if (turnContext.Activity.Value != null)
    {
        // This is a response from an Adaptive Card
        dynamic data = turnContext.Activity.Value;
        
        if (data.actionType == "submitAction")
        {
            // Process the submitted data
            string name = data.name;
            string email = data.email;
            
            // Respond to the user
            await turnContext.SendActivityAsync(MessageFactory.Text($"Thank you, {name}! We'll contact you at {email}."), cancellationToken);
        }
    }
    else
    {
        // Regular message handling
        // ...
    }
}
```

## Advanced Features

### Card Templates

Card Templates allow you to separate the data from the layout of your card:

```json
{
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "${title}",
      "size": "Large",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "${description}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "${buttonText}",
      "data": {
        "actionType": "${actionType}"
      }
    }
  ]
}
```

Then populate it with data:

```javascript
const template = new ACData.Template(cardTemplate);
const card = template.expand({
  $root: {
    title: "Welcome to our service",
    description: "We offer the best products at competitive prices.",
    buttonText: "Learn More",
    actionType: "learnMoreAction"
  }
});
```

### Card Error Handling

Implement proper error handling for card rendering and submission:

```javascript
try {
  const cardAttachment = CardFactory.adaptiveCard(cardJson);
  await context.sendActivity({ attachments: [cardAttachment] });
} catch (error) {
  console.error('Error creating or sending adaptive card:', error);
  await context.sendActivity('Sorry, I encountered an error creating the card.');
}
```

### Accessibility Considerations

- Ensure sufficient color contrast
- Provide alternative text for images
- Use clear and descriptive labels for input fields
- Test with screen readers

```json
{
  "type": "Image",
  "url": "https://example.com/image.png",
  "altText": "Description of the image for screen readers"
}
```

## Best Practices

### Design Guidelines

1. **Keep it simple**: Don't overwhelm users with too many elements
2. **Mobile-first**: Design with small screens in mind
3. **Clear actions**: Make buttons distinct and purpose clear
4. **Error handling**: Provide feedback for invalid inputs
5. **Consistent styling**: Maintain visual consistency with your brand
6. **Progressive disclosure**: Use ShowCard for complex interactions
7. **Optimize performance**: Keep card size small and minimize images

### Performance Optimization

- Compress images before including them
- Use CDNs for hosting images
- Minimize the number of elements in a card
- Avoid deep nesting of containers
- Cache templates on the client side

### Security Considerations

- Validate all input received from cards
- Sanitize data before processing
- Don't include sensitive information in cards
- Implement proper authentication for actions
- Use HTTPS for all external resources

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Card not rendering | Check JSON format and schema version |
| Actions not working | Verify action handler code in your bot |
| Images not displaying | Check image URLs and access permissions |
| Input validation failing | Review input constraints and error messages |
| Card too large | Simplify design or split into multiple cards |

### Debugging Tools

- [Adaptive Cards Designer](https://adaptivecards.io/designer/): Visual tool for creating and testing cards
- [Adaptive Cards Visualizer](https://adaptivecards.io/visualizer/): Test how cards render across platforms
- [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator): Test bots locally
- Browser developer tools for inspecting network requests and responses

## Integration with ACS Features

### Teams Integration

When using Adaptive Cards with ACS bots in Microsoft Teams:

```javascript
// Ensure Teams-specific properties are included
const card = {
  type: "AdaptiveCard",
  version: "1.3",
  msTeams: {
    width: "full"
  },
  // ... rest of the card
};
```

### Chat Integration

For ACS chat applications:

```javascript
// In an ACS chat bot
const sendAdaptiveCard = async (chatThreadId, userId, card) => {
  const chatClient = new ChatClient(endpoint, new AzureCommunicationTokenCredential(userToken));
  const chatThreadClient = chatClient.getChatThreadClient(chatThreadId);
  
  await chatThreadClient.sendMessage({
    content: JSON.stringify(card),
    senderDisplayName: 'ChatBot',
    type: 'html'
  });
};
```

### Voice and Video Integration

Use Adaptive Cards to enhance voice and video calls:

```javascript
// Display an Adaptive Card during a call
const displayCardDuringCall = async (call, card) => {
  const attachment = {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: card
  };
  
  await call.sendMessage({ attachments: [attachment] });
};
```

## Resources and References

### Official Documentation

- [Adaptive Cards Official Site](https://adaptivecards.io/)
- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)
- [Bot Framework Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Microsoft Teams Bot Development](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)

### Sample Projects

- [ACS Bot Samples on GitHub](https://github.com/Azure-Samples/communication-services-javascript-quickstarts)
- [Adaptive Cards Community Samples](https://github.com/microsoft/AdaptiveCards/tree/main/samples)
- [Bot Framework Samples](https://github.com/microsoft/BotBuilder-Samples)

### Community and Support

- [Microsoft Q&A for ACS](https://docs.microsoft.com/en-us/answers/topics/azure-communication-services.html)
- [Stack Overflow - Adaptive Cards Tag](https://stackoverflow.com/questions/tagged/adaptive-cards)
- [Microsoft Teams Developer Community](https://techcommunity.microsoft.com/t5/microsoft-teams-developer/bd-p/MicrosoftTeamsDev)
- [Azure Communication Services GitHub Issues](https://github.com/Azure/Communication/issues)

## Versioning and Compatibility

### Adaptive Cards Versions

| Version | Key Features | Compatibility |
|---------|--------------|--------------|
| 1.0     | Basic elements and actions | All platforms |
| 1.1     | Media elements, Action.ToggleVisibility | Most platforms |
| 1.2     | Action.Execute, fallback improvements | Teams, Outlook, Windows |
| 1.3     | Input validation, Action.ShowCard improvements | Teams, newer platforms |
| 1.4     | Authentication cards, improved accessibility | Limited platform support |

### Platform-Specific Considerations

Different platforms may support different features or have different rendering approaches:

- **Teams**: Supports most features up to v1.3, with some Teams-specific extensions
- **Outlook**: Good support for v1.2 with some limitations on inputs
- **Windows**: Supports most features with native-looking controls
- **Web**: Rendering capabilities depend on the specific implementation

Always test your cards on each target platform to ensure they render and function as expected.
