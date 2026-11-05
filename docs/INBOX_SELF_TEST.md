# Test an offer before sending

In **Organizer → Inbox → New offer**, enter the subject and message, attach any briefer, and choose **Send test to myself**. Participant selection is not required. The current draft and selections are kept.

The organizer receives a clearly labelled Test offer in their own inbox and an email to their own account address when email is configured. The test includes the same attachments and supports the same Yes/No confirmation, timestamp and final-answer behavior as a participant offer. To test the other answer, send another test.

Only the receiving organizer can see or answer that test. No participant or other organizer receives a copy or response notification. Test responses belong to the test offer and never modify real offers. Real sending still requires the existing recipient review step. Email status distinguishes server acceptance, failure and uncertain delivery; a saved inbox test does not imply successful email delivery.

Apply migration `20261105060000_inbox_test_offers`. It adds `InboxMessage.isTest` with a default of false; existing messages, responses and attachments are retained.
