import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import {PageHeader} from '../components/PageHeader';
import {legalPages} from '../content/legal';
import {CONTACT_EMAIL} from '../content/site';

const PAGES = legalPages(CONTACT_EMAIL);

export function isLegalSlug(slug: string): boolean {
  return Object.hasOwn(PAGES, slug);
}

export function LegalPage({slug}: {slug: string}) {
  const page = PAGES[slug];
  return (
    <VStack gap={4}>
      <PageHeader title={page.title} lead={`Última actualización: ${page.updated}`} />
      <div className="lupa-measure">
        <VStack gap={4}>
          {page.sections.map((s) => (
            <VStack key={s.heading} gap={2}>
              <Heading level={2}>{s.heading}</Heading>
              {s.paragraphs.map((p) => (
                <Text as="p" key={p.slice(0, 40)}>
                  {p}
                </Text>
              ))}
            </VStack>
          ))}
        </VStack>
      </div>
    </VStack>
  );
}
