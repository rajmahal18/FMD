# Test an offer before sending

## Send to a facilitator

Organizers can also open **New offer → Facilitators**, select any active event facilitators, compose the message, attach files and review the recipients before sending. Multiple facilitators may be selected. The one-per-team limit applies only to participant selections; facilitator selections do not replace participant selections.

Facilitators open **Account → Inbox**, read their own offers and attachments, then choose Yes/No and confirm. Organizer copies and response notifications use the existing offer flow. They cannot compose, send offers, see other recipients' messages or access their attachments. Inbox remains accessible through Account during open judging, while other navigation tabs stay hidden and scoring remains the default screen.

These are separately addressed offers with their own responses, not the private self-test feature below. No schema migration is required for facilitator recipients.

## Send to yourself

In **Organizer → Inbox → New offer**, enter the subject and message, attach any briefer, and choose **Send test to myself**. Participant selection is not required. The current draft and selections are kept.

The organizer receives a clearly labelled Test offer in their own inbox and an email to their own account address when email is configured. The test includes the same attachments and supports the same Yes/No confirmation, timestamp and final-answer behavior as a participant offer. To test the other answer, send another test.

Only the receiving organizer can see or answer that test. No participant or other organizer receives a copy or response notification. Test responses belong to the test offer and never modify real offers. Real sending still requires the existing recipient review step. Email status distinguishes server acceptance, failure and uncertain delivery; a saved inbox test does not imply successful email delivery.

Apply migration `20261105060000_inbox_test_offers`. It adds `InboxMessage.isTest` with a default of false; existing messages, responses and attachments are retained.
