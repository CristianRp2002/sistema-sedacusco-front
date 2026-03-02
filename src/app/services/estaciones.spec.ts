import { TestBed } from '@angular/core/testing';

import { Estaciones } from './estaciones';

describe('Estaciones', () => {
  let service: Estaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Estaciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
