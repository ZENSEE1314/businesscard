-- Business Opportunities (rebranded marketplace): browsing sections.
CREATE TYPE "OpportunitySection" AS ENUM ('INVESTORS', 'CUSTOMERS', 'SUPPLIERS', 'DISTRIBUTORS', 'PARTNERSHIP', 'JOBS');
ALTER TABLE "MarketplaceListing" ADD COLUMN "section" "OpportunitySection";

-- Event attendance: attendees scan the host's QR at the venue.
ALTER TABLE "EventAttendee" ADD COLUMN "attendedAt" TIMESTAMP(3);
