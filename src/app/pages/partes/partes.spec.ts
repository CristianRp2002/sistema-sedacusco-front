import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Partes } from './partes';

describe('Partes', () => {
  let component: Partes;
  let fixture: ComponentFixture<Partes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Partes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Partes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
