import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IdeaForm } from '@/components/ideas/IdeaForm';

export default function NewIdeaPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit a New Idea</CardTitle>
        </CardHeader>
        <CardContent>
          <IdeaForm />
        </CardContent>
      </Card>
    </div>
  );
}
