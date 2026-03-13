import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichaPdf } from './ficha-pdf';

describe('FichaPdf', () => {
  let component: FichaPdf;
  let fixture: ComponentFixture<FichaPdf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaPdf]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichaPdf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
