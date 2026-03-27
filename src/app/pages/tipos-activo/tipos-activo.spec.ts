import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposActivo } from './tipos-activo';

describe('TiposActivo', () => {
  let component: TiposActivo;
  let fixture: ComponentFixture<TiposActivo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiposActivo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiposActivo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
