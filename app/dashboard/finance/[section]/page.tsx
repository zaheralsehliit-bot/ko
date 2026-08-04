import { FinanceCenter } from "@/app/_components/finance-center";
export default async function FinanceSectionPage({params}:{params:Promise<{section:string}>}){const {section}=await params; return <FinanceCenter section={section}/>;}
