import PublicSheetPage, { generateMetadata } from '../../share/sheet/[slug]/page';

export const revalidate = 180;
export { generateMetadata };
export default PublicSheetPage;
