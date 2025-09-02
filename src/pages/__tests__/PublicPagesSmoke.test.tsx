import { renderWithAppProviders } from '@/test/test-utils';
import Index from '../Index';
import Catalog from '../Catalog';
import Pricing from '../Pricing';
import Samples from '../Samples';
import Designers from '../Designers';
import Customize from '../Customize';
import Dashboard from '../Dashboard';
import CaseStudies from '../CaseStudies';
import CaseStudyArticle from '../CaseStudyArticle';
import Terms from '../Terms';
import Privacy from '../Privacy';

describe('Public pages render without crashing', () => {
  it('Index', () => { renderWithAppProviders(<Index />); });
  it('Catalog', () => { renderWithAppProviders(<Catalog />); });
  it('Pricing', () => { renderWithAppProviders(<Pricing />); });
  it('Samples', () => { renderWithAppProviders(<Samples />); });
  it('Designers', () => { renderWithAppProviders(<Designers />); });
  it('Customize', () => { renderWithAppProviders(<Customize />); });
  it('Dashboard', () => { renderWithAppProviders(<Dashboard />); });
  it('CaseStudies', () => { renderWithAppProviders(<CaseStudies />); });
  it('CaseStudyArticle', () => { renderWithAppProviders(<CaseStudyArticle />); });
  it('Terms', () => { renderWithAppProviders(<Terms />); });
  it('Privacy', () => { renderWithAppProviders(<Privacy />); });
});

