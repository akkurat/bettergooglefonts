import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClassifierComponent } from './classifier/classifier.component';
import { FontoverviewComponent } from './fontoverview/fontoverview.component';
import { ClassifierJsonComponent } from './classifier-json/classifier-json.component';
import { ViewFontComponent } from './view-font/view-font.component';

const routes: Routes = [
  { path: '', redirectTo: '/browse', pathMatch: 'full' },
  { path: 'browse', component: FontoverviewComponent },
  { path: 'classify/:name', component: ClassifierComponent },
  { path: 'view/:name', component: ViewFontComponent },
  { path: 'classify-json', component: ClassifierJsonComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
