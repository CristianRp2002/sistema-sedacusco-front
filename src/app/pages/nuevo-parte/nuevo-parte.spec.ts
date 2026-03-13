import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoParte } from './nuevo-parte';

describe('NuevoParte', () => {
  let component: NuevoParte;
  let fixture: ComponentFixture<NuevoParte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoParte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoParte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
