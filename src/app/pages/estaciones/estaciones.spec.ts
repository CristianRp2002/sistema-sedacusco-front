import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Estaciones } from './estaciones';

describe('Estaciones', () => {
  let component: Estaciones;
  let fixture: ComponentFixture<Estaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Estaciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Estaciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
