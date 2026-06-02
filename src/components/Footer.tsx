import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-[hsl(210,69%,9%)] dark:bg-[hsl(210,69%,7%)] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">
              Open<span className="text-blue-400">Key</span>
            </h3>
            <p className="text-gray-300 mb-6 max-w-md">
              {t('footer.tagline')}
            </p>
            <div className="space-y-2">
              <p className="text-gray-300">
                <span className="font-semibold">{t('footer.email')}:</span> support@openkeyhousing.com
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.forTenants')}</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/tenants" className="hover:text-white transition-colors">Have a Voucher?</Link></li>
              <li><Link to="/find-home" className="hover:text-white transition-colors">{t('footer.findHousing')}</Link></li>
              <li><Link to="/section8-info" className="hover:text-white transition-colors">{t('footer.section8Info')}</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">{t('footer.blog')}</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">{t('footer.faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.forPartners')}</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/landlords/small" className="hover:text-white transition-colors">{t('footer.listProperty')}</Link></li>
              <li><Link to="/for-agencies" className="hover:text-white transition-colors">For Housing Authorities</Link></li>
              <li><Link to="/agency/login" className="hover:text-white transition-colors">Housing Authority Login</Link></li>
              <li><Link to="/landlords/portfolios" className="hover:text-white transition-colors">For Property Managers</Link></li>
              <li><Link to="/landlords/investors" className="hover:text-white transition-colors">For Investors</Link></li>
              <li><Link to="/landlords/realtors" className="hover:text-white transition-colors">For Realtors</Link></li>
              <li><Link to="/investor-signup" className="hover:text-white transition-colors">{t('footer.joinBuyersList')}</Link></li>
              <li><Link to="/resources" className="hover:text-white transition-colors">{t('footer.resources')}</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Housing Intelligence</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/tools/property-rent-analyzer" className="hover:text-white transition-colors">Rent Analyzer</Link></li>
              <li><Link to="/tools/tenant-eligibility" className="hover:text-white transition-colors">Eligibility Calculator</Link></li>
              <li><Link to="/tools/housing-market-demand" className="hover:text-white transition-colors">Market Demand</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <div className="mb-4">
            <Link to="/privacy" className="text-gray-300 hover:text-white mx-3 transition-colors">{t('footer.privacyPolicy')}</Link>
            <Link to="/terms" className="text-gray-300 hover:text-white mx-3 transition-colors">{t('footer.termsOfService')}</Link>
            <Link to="/contact" className="text-gray-300 hover:text-white mx-3 transition-colors">{t('footer.contact')}</Link>
          </div>
          <p className="text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
